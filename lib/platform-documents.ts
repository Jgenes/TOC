import { randomUUID, createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  realpathSync,
} from "node:fs";
import { resolve, dirname, basename } from "node:path";
import { spawnSync } from "node:child_process";
import type { NextRequest } from "next/server";
import { audit, demand, platformDb } from "./platform-store";
import { requireInquiry, workFor } from "./platform-business";
import { authorize, hasPermission, type Principal } from "./platform-auth";
import { publishedContent } from "./platform-cms";

const MAX_FILE = 5 * 1024 * 1024;
function root() {
  const path = resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.PRIVATE_STORAGE_PATH || "data/private-documents",
  );
  mkdirSync(path, { recursive: true, mode: 0o700 });
  return realpathSync(path);
}
function storagePath(key: string) {
  demand(/^[a-f0-9-]{36}$/.test(key), 400, "Invalid storage key.");
  return resolve(root(), key);
}
function sniff(bytes: Buffer, name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "pdf" && bytes.subarray(0, 5).toString() === "%PDF-")
    return "application/pdf";
  if (
    ["jpg", "jpeg"].includes(extension || "") &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return "image/jpeg";
  if (
    extension === "png" &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    extension === "webp" &&
    bytes.subarray(0, 4).toString() === "RIFF" &&
    bytes.subarray(8, 12).toString() === "WEBP"
  )
    return "image/webp";
  if (
    extension === "txt" &&
    !bytes.includes(0) &&
    !/[<>]/.test(bytes.toString("utf8"))
  )
    return "text/plain";
  demand(
    false,
    422,
    "Use a PDF, JPEG, PNG, WebP or plain text file with a matching file signature. Active formats, archives and executables are not accepted.",
  );
}
export async function uploadDocument(user: Principal, request: NextRequest) {
  const inquiryId = request.nextUrl.searchParams.get("inquiryId") || "",
    name = basename(request.nextUrl.searchParams.get("name") || "document")
      .replace(/[^\p{L}\p{N} ._()-]/gu, "_")
      .slice(0, 150);
  const companyUpload = request.nextUrl.searchParams.get("scope") === "company";
  const department = request.nextUrl.searchParams.get("department") || "";
  const visibility =
    request.nextUrl.searchParams.get("visibility") ||
    (companyUpload ? "internal" : "customer");
  demand(
    ["customer", "internal"].includes(visibility),
    422,
    "Choose customer-visible or internal access.",
  );
  if (companyUpload) requireCompanyAccess(user, department);
  else {
    requireInquiry(user, inquiryId);
    if (workFor(inquiryId).customer_id !== user.id)
      requireInquiry(user, inquiryId, "inquiry.edit");
    else
      demand(
        visibility === "customer",
        403,
        "Customer uploads belong to the shared customer thread, not internal staff storage.",
      );
  }
  demand(
    Number(request.headers.get("content-length") || 0) <= MAX_FILE,
    413,
    "The upload limit is 5 MB.",
  );
  const reader = request.body?.getReader();
  demand(reader, 400, "Choose a file to upload.");
  const chunks: Buffer[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > MAX_FILE) {
      await reader.cancel();
      demand(false, 413, "The upload limit is 5 MB.");
    }
    chunks.push(Buffer.from(part.value));
  }
  demand(size > 0, 422, "Empty files are not accepted.");
  let bytes = Buffer.concat(chunks),
    mime = sniff(bytes, name),
    safeName = name;
  if (mime.startsWith("image/")) {
    try {
      const { default: sharp } = await import("sharp");
      bytes = await sharp(bytes, { limitInputPixels: 40000000 })
        .rotate()
        .webp({ quality: 82 })
        .toBuffer();
      mime = "image/webp";
      safeName = name.replace(/\.[^.]+$/, ".webp");
      size = bytes.length;
    } catch {
      demand(
        false,
        422,
        "The image is malformed or exceeds the supported pixel limit.",
      );
    }
  }
  const id = randomUUID(),
    key = randomUUID(),
    path = storagePath(key),
    db = platformDb();
  writeFileSync(path, bytes, { mode: 0o600, flag: "wx" });
  try {
    db.prepare(
      "INSERT INTO private_documents(id,inquiry_id,owner_id,storage_key,name,mime,size,sha256,created_at,department,visibility) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
    ).run(
      id,
      companyUpload ? null : inquiryId,
      user.id,
      key,
      safeName,
      mime,
      size,
      createHash("sha256").update(bytes).digest("hex"),
      new Date().toISOString(),
      companyUpload ? department : "",
      companyUpload ? "internal" : visibility,
    );
  } catch (error) {
    unlinkSync(path);
    throw error;
  }
  audit(user.id, "document.quarantined", "document", id, undefined, {
    inquiryId: companyUpload ? null : inquiryId,
    size,
    mime,
    scope: companyUpload ? "company" : "inquiry",
  });
  return {
    id,
    state: "quarantined",
    message:
      "Stored privately in quarantine. Download is disabled until the configured malware scanner passes the file. Do not upload credentials or private keys.",
  };
}
export function scanQuarantinedDocuments(maximum = 10) {
  const scanner = process.env.MALWARE_SCANNER_PATH;
  if (!scanner) return { configured: false, scanned: 0 };
  demand(
    scanner.startsWith("/"),
    503,
    "Configure an absolute malware-scanner executable path.",
  );
  const db = platformDb(),
    rows = db
      .prepare(
        "SELECT id,storage_key FROM private_documents WHERE scan_state='quarantined' ORDER BY created_at LIMIT ?",
      )
      .all(Math.min(25, maximum)) as { id: string; storage_key: string }[];
  let scanned = 0;
  for (const row of rows) {
    const result = spawnSync(
      scanner,
      ["--no-summary", storagePath(row.storage_key)],
      { timeout: 30000, encoding: "utf8", maxBuffer: 8192 },
    );
    if (result.error || (result.status !== 0 && result.status !== 1)) continue;
    const state = result.status === 0 ? "clean" : "rejected";
    db.prepare(
      "UPDATE private_documents SET scan_state=? WHERE id=? AND scan_state='quarantined'",
    ).run(state, row.id);
    audit("scanner", `document.${state}`, "document", row.id);
    scanned++;
  }
  return { configured: true, scanned };
}
export function listDocuments(user: Principal, inquiryId: string) {
  requireInquiry(user, inquiryId);
  return platformDb()
    .prepare(
      `SELECT id,inquiry_id,name,mime,size,scan_state,visibility,created_at FROM private_documents WHERE inquiry_id=? ${workFor(inquiryId).customer_id === user.id ? "AND visibility='customer'" : ""} ORDER BY created_at DESC`,
    )
    .all(inquiryId);
}
export function downloadDocument(user: Principal, id: string) {
  const row = platformDb()
    .prepare("SELECT * FROM private_documents WHERE id=?")
    .get(id) as
    | {
        id: string;
        inquiry_id: string | null;
        department: string;
        storage_key: string;
        name: string;
        mime: string;
        scan_state: string;
        sha256: string;
        visibility: string;
      }
    | undefined;
  demand(row, 404, "Document not found.");
  if (row.inquiry_id) {
    requireInquiry(user, row.inquiry_id);
    if (workFor(row.inquiry_id).customer_id === user.id)
      demand(
        row.visibility === "customer",
        403,
        "This document is not available in the customer portal.",
      );
  } else requireCompanyAccess(user, row.department);
  demand(
    row.scan_state === "clean",
    423,
    "This file is quarantined or rejected and cannot be downloaded.",
  );
  const bytes = readFileSync(storagePath(row.storage_key));
  demand(
    createHash("sha256").update(bytes).digest("hex") === row.sha256,
    409,
    "File integrity could not be verified.",
  );
  audit(user.id, "document.downloaded", "document", id);
  return { bytes, name: row.name, mime: row.mime };
}

export function publicDocument(id: string, media = false) {
  const allowed = publishedContent().some(
    (item) =>
      (media
        ? [
            "page",
            "package",
            "menu",
            "career",
            "testimonial",
            "faq",
            "knowledge",
            "gallery",
            "project",
            "team",
            "client",
            "article",
            "service",
            "homepage",
          ].includes(item.type)
        : item.type === "document") && item.data.documentId === id,
  );
  demand(allowed, 404, "Public asset not found.");
  const row = platformDb()
    .prepare(
      "SELECT * FROM private_documents WHERE id=? AND inquiry_id IS NULL AND scan_state='clean'",
    )
    .get(id) as
    | { storage_key: string; name: string; mime: string; sha256: string }
    | undefined;
  demand(
    row &&
      (media ? row.mime.startsWith("image/") : row.mime === "application/pdf"),
    404,
    "Public asset not found.",
  );
  const bytes = readFileSync(storagePath(row.storage_key));
  demand(
    createHash("sha256").update(bytes).digest("hex") === row.sha256,
    409,
    "Asset integrity verification failed.",
  );
  return { bytes, name: row.name, mime: row.mime };
}

function requireCompanyAccess(user: Principal, department: string) {
  authorize(user, "content.edit", department || undefined);
  if (!department)
    demand(
      user.roles.some((role) =>
        ["administrator", "publisher", "editor", "marketing"].includes(role),
      ),
      403,
      "Shared company assets require a corporate editorial role; choose your department for departmental material.",
    );
}
export function listCompanyDocuments(user: Principal) {
  authorize(user, "content.edit");
  const corporate = user.roles.some((role) =>
    ["administrator", "publisher", "editor", "marketing"].includes(role),
  );
  return (
    platformDb()
      .prepare(
        "SELECT id,name,mime,size,scan_state,created_at,department FROM private_documents WHERE inquiry_id IS NULL ORDER BY created_at DESC LIMIT 500",
      )
      .all() as { department: string }[]
  ).filter((row) =>
    row.department
      ? hasPermission(user, "content.edit", row.department)
      : corporate,
  );
}
