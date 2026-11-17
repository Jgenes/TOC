import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";
import { company, isPreview } from "./content";
import { platformDb, demand } from "./platform-store";
import { hashToken } from "./platform-auth";

export function applicationUrl(previewOrigin?: string) {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL || (isPreview ? previewOrigin : undefined);
  demand(
    value,
    503,
    "The public application URL must be configured before account email can be enabled.",
  );
  const url = new URL(value);
  demand(
    isPreview || url.protocol === "https:",
    503,
    "The public application URL must use HTTPS.",
  );
  return url.origin;
}
export function queueMail(
  key: string,
  recipient: string,
  subject: string,
  body: string,
  replyTo?: string,
) {
  const id = randomUUID();
  platformDb()
    .prepare(
      "INSERT OR IGNORE INTO notification_outbox(id,dedup_key,recipient,subject,body,state,created_at) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      id,
      key,
      recipient,
      subject,
      body,
      isPreview ? "preview" : "pending",
      new Date().toISOString(),
    );
  if (replyTo) {
    demand(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo),
      422,
      "Invalid notification reply address.",
    );
    platformDb()
      .prepare(
        "UPDATE notification_outbox SET reply_to=? WHERE dedup_key=? AND attempts=0",
      )
      .run(replyTo, key);
  }
  return (
    platformDb()
      .prepare("SELECT id FROM notification_outbox WHERE dedup_key=?")
      .get(key) as { id: string }
  ).id;
}
export async function processNotificationOutbox(maximum = 10) {
  const db = platformDb();
  if (isPreview) return { sent: 0, failed: 0, preview: true };
  if (!process.env.SMTP_PASS) return { sent: 0, failed: 0, configured: false };
  const port = Number(process.env.SMTP_PORT || 465),
    host = process.env.SMTP_HOST || "mail.tocinvestment.co.tz",
    secure = process.env.SMTP_SECURE !== "false",
    user = process.env.SMTP_USER || company.email;
  demand(
    Number.isInteger(port) &&
      port > 0 &&
      port < 65536 &&
      /^[a-zA-Z0-9.-]+$/.test(host) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user),
    503,
    "Email configuration is invalid.",
  );
  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass: process.env.SMTP_PASS },
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  const result = { sent: 0, failed: 0 };
  // Recover an interrupted worker lease; one worker claims each row transactionally.
  db.prepare(
    "UPDATE notification_outbox SET state=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,last_error='Interrupted worker lease recovered' WHERE state='sending' AND next_attempt_at<=?",
  ).run(Date.now());
  for (let index = 0; index < Math.min(25, maximum); index++) {
    const row = db.transaction(() => {
      const item = db
        .prepare(
          "SELECT * FROM notification_outbox WHERE state IN ('pending','retry') AND attempts<5 AND next_attempt_at<=? ORDER BY created_at LIMIT 1",
        )
        .get(Date.now()) as
        | {
            id: string;
            dedup_key: string;
            recipient: string;
            subject: string;
            body: string;
            attempts: number;
            reply_to: string | null;
          }
        | undefined;
      if (!item) return null;
      db.prepare(
        "UPDATE notification_outbox SET state='sending',attempts=attempts+1,next_attempt_at=? WHERE id=?",
      ).run(Date.now() + 60000, item.id);
      return item;
    })();
    if (!row) break;
    try {
      const sent = await transport.sendMail({
        from: { name: company.name, address: user },
        to: { address: row.recipient, name: "TOC customer / team" },
        subject: row.subject.replace(/[\r\n]/g, " "),
        text: row.body,
        ...(row.reply_to
          ? { replyTo: { address: row.reply_to, name: "TOC inquiry customer" } }
          : {}),
        messageId: `<${hashToken(row.dedup_key)}@${user.split("@")[1]}>`,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (
        !sent.accepted.some(
          (address) =>
            String(address).toLowerCase() === row.recipient.toLowerCase(),
        )
      )
        throw new Error("NOT_ACCEPTED");
      db.prepare(
        "UPDATE notification_outbox SET state='sent',sent_at=?,last_error=NULL WHERE id=?",
      ).run(new Date().toISOString(), row.id);
      result.sent++;
    } catch {
      db.prepare(
        "UPDATE notification_outbox SET state=?,last_error='SMTP delivery attempt failed',next_attempt_at=? WHERE id=?",
      ).run(
        row.attempts >= 4 ? "failed" : "retry",
        Date.now() + Math.min(3600000, 60000 * 2 ** row.attempts),
        row.id,
      );
      result.failed++;
    }
  }
  transport.close();
  return result;
}
