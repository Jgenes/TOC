import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import {
  todayInTanzania,
  type Inquiry,
  type InquiryStatus,
  type StoredInquiry,
  canTransition,
} from "./inquiry";
let instance: Database.Database | undefined;
export function database() {
  if (instance) return instance;
  // Runtime database path is deliberately excluded from build-time file tracing.
  const path = resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.DATABASE_PATH || "data/toc.sqlite",
  );
  mkdirSync(dirname(path), { recursive: true });
  instance = new Database(path);
  instance.pragma("journal_mode = WAL");
  instance.pragma("foreign_keys = ON");
  instance.pragma("busy_timeout = 5000");
  instance.exec(`CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','in_review','contacted','closed')),
    payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  ); CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at DESC);
  CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, inquiry_id TEXT NOT NULL REFERENCES inquiries(id), action TEXT NOT NULL, previous_status TEXT, next_status TEXT, created_at TEXT NOT NULL);`);
  return instance;
}
type Row = {
  id: string;
  reference: string;
  status: InquiryStatus;
  payload: string;
  created_at: string;
  updated_at: string;
};
function mapRow(row: Row): StoredInquiry {
  return {
    ...JSON.parse(row.payload),
    id: row.id,
    reference: row.reference,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
export function saveInquiry(input: Inquiry) {
  const db = database();
  const id = randomUUID();
  const now = new Date().toISOString();
  const reference = `TOC-${todayInTanzania().slice(0, 4)}-${randomBytes(4).toString("hex").toUpperCase()}`;
  // Store only validated fields; never save the honeypot field.
  const { website: _website, ...payload } = input;
  db.transaction(() => {
    db.prepare(
      "INSERT INTO inquiries(id,reference,payload,created_at,updated_at) VALUES(?,?,?,?,?)",
    ).run(id, reference, JSON.stringify(payload), now, now);
    db.prepare(
      "INSERT INTO audit_logs(id,inquiry_id,action,next_status,created_at) VALUES(?,?,?,?,?)",
    ).run(randomUUID(), id, "created", "new", now);
  })();
  return { id, reference, createdAt: now };
}
export function listInquiries(): StoredInquiry[] {
  return (
    database()
      .prepare("SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 1000")
      .all() as Row[]
  ).map(mapRow);
}
export function changeInquiryStatus(id: string, next: InquiryStatus) {
  const db = database();
  return db.transaction(() => {
    const row = db.prepare("SELECT * FROM inquiries WHERE id=?").get(id) as
      Row | undefined;
    if (!row) return { error: "Inquiry not found.", status: 404 } as const;
    if (!canTransition(row.status, next))
      return {
        error:
          "That status transition is not allowed. Review the inquiry before moving it forward.",
        status: 409,
      } as const;
    if (row.status !== next) {
      const now = new Date().toISOString();
      db.prepare("UPDATE inquiries SET status=?,updated_at=? WHERE id=?").run(
        next,
        now,
        id,
      );
      db.prepare(
        "INSERT INTO audit_logs(id,inquiry_id,action,previous_status,next_status,created_at) VALUES(?,?,?,?,?,?)",
      ).run(randomUUID(), id, "status_changed", row.status, next, now);
      row.status = next;
      row.updated_at = now;
    }
    return { inquiry: mapRow(row) };
  })();
}
