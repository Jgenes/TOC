import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { NextRequest } from "next/server";
const limits = new Map<string, { count: number; until: number }>();
const rateKey = randomBytes(32);
export function rateLimit(
  request: NextRequest,
  area: string,
  maximum = 8,
  windowMs = 30 * 60 * 1000,
) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const key = createHmac("sha256", rateKey)
    .update(`${area}:${ip}`)
    .digest("hex");
  const now = Date.now();
  if (limits.size > 5000)
    for (const [key, value] of limits)
      if (value.until <= now) limits.delete(key);
  const hit = limits.get(key);
  if (!hit || hit.until <= now) {
    if (!hit && limits.size >= 10000) return false;
    limits.set(key, { count: 1, until: now + windowMs });
    return true;
  }
  if (hit.count >= maximum) return false;
  hit.count++;
  return true;
}
export function safeOrigin(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return (
      host === request.headers.get("host") ||
      host === request.headers.get("x-forwarded-host") ||
      host === request.nextUrl.host
    );
  } catch {
    return false;
  }
}
export async function readJsonLimited(request: NextRequest, maxBytes = 24576) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new Error("CONTENT_TYPE");
  if (Number(request.headers.get("content-length") || 0) > maxBytes)
    throw new Error("TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("INVALID_JSON");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    size += result.value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("TOO_LARGE");
    }
    chunks.push(result.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("INVALID_JSON");
  }
}
export const STAFF_COOKIE = "toc_staff_session";
export function staffConfigured() {
  return (
    !!process.env.STAFF_PASSWORD &&
    (process.env.SESSION_SECRET?.length || 0) >= 32
  );
}
export function passwordMatches(input: string) {
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return (
    staffConfigured() &&
    timingSafeEqual(hash(input), hash(process.env.STAFF_PASSWORD || ""))
  );
}
export function createStaffSession() {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + 8 * 60 * 60 * 1000,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  const sig = createHmac("sha256", process.env.SESSION_SECRET!)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}
export function validStaffSession(value?: string) {
  if (!staffConfigured() || !value || value.length > 512) return false;
  try {
    const parts = value.split(".");
    if (parts.length !== 2) return false;
    const [payload, sig] = parts;
    const expected = createHmac("sha256", process.env.SESSION_SECRET!)
      .update(payload)
      .digest();
    const received = Buffer.from(sig, "base64url");
    if (
      received.length !== expected.length ||
      !timingSafeEqual(expected, received)
    )
      return false;
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf-8"),
    );
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}
export const authenticated = (request: NextRequest) =>
  process.env.NEXT_PUBLIC_PREVIEW_MODE !== "false" &&
  validStaffSession(request.cookies.get(STAFF_COOKIE)?.value);
export const privateHeaders = { "Cache-Control": "no-store, private" };
