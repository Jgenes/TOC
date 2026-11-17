import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* Use hosting environment. */
}
const source = resolve(process.env.DATABASE_PATH || "data/toc.sqlite");
if (!existsSync(source))
  throw new Error(
    "Database not found. Start the application before creating a backup.",
  );
const target = resolve(
  process.argv[2] ||
    `backups/${new Date().toISOString().replace(/[:.]/g, "-")}`,
);
if (existsSync(join(target, "manifest.json")))
  throw new Error("Refusing to overwrite an existing backup.");
mkdirSync(target, { recursive: true, mode: 0o700 });
const connection = new Database(source, { readonly: true });
await connection.backup(join(target, "toc.sqlite"));
connection.close();
const backup = new Database(join(target, "toc.sqlite"), { readonly: true });
const integrity = backup.pragma("integrity_check", { simple: true });
if (integrity !== "ok")
  throw new Error("Backup failed SQLite integrity checking.");
const hasDocuments = backup
  .prepare(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='private_documents'",
  )
  .get();
const documents = hasDocuments
  ? (backup
      .prepare("SELECT storage_key,sha256 FROM private_documents")
      .all() as { storage_key: string; sha256: string }[])
  : [];
const privateRoot = resolve(
    process.env.PRIVATE_STORAGE_PATH || "data/private-documents",
  ),
  files: Record<string, string> = {};
mkdirSync(join(target, "private-documents"), { mode: 0o700 });
for (const document of documents) {
  if (!/^[a-f0-9-]{36}$/.test(document.storage_key))
    throw new Error("Invalid document storage key.");
  const bytes = readFileSync(join(privateRoot, document.storage_key)),
    hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== document.sha256)
    throw new Error("A stored document failed its checksum.");
  copyFileSync(
    join(privateRoot, document.storage_key),
    join(target, "private-documents", document.storage_key),
  );
  files[document.storage_key] = hash;
}
const manifest = {
  version: 1,
  createdAt: new Date().toISOString(),
  databaseSha256: createHash("sha256")
    .update(readFileSync(join(target, "toc.sqlite")))
    .digest("hex"),
  files,
  inquiryCount: (
    backup.prepare("SELECT COUNT(*) AS count FROM inquiries").get() as {
      count: number;
    }
  ).count,
  notice:
    "Contains private data. Encrypt and copy offsite using the approved hosting process. SESSION_SECRET and SMTP/AI secrets are NOT included; recover them through the secret manager.",
};
backup.close();
writeFileSync(
  join(target, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  { mode: 0o600 },
);
// A representative restoration is tested to an isolated path, never over live data.
const restored = mkdtempSync(join(tmpdir(), "toc-restore-verification-"));
try {
  copyFileSync(join(target, "toc.sqlite"), join(restored, "toc.sqlite"));
  const restoredDb = new Database(join(restored, "toc.sqlite"), {
    readonly: true,
  });
  if (restoredDb.pragma("integrity_check", { simple: true }) !== "ok")
    throw new Error("Restoration failed.");
  const count = (
    restoredDb.prepare("SELECT COUNT(*) AS count FROM inquiries").get() as {
      count: number;
    }
  ).count;
  if (count !== manifest.inquiryCount)
    throw new Error("Restored record count mismatch.");
  restoredDb.close();
  for (const [key, hash] of Object.entries(files)) {
    copyFileSync(join(target, "private-documents", key), join(restored, key));
    if (
      createHash("sha256")
        .update(readFileSync(join(restored, key)))
        .digest("hex") !== hash
    )
      throw new Error("Restored document mismatch.");
  }
} finally {
  rmSync(restored, { recursive: true, force: true });
}
console.log(
  JSON.stringify({
    backup: target,
    sqliteIntegrity: "ok",
    isolatedRestore: "passed",
    privateDocuments: documents.length,
    secretsIncluded: false,
  }),
);
