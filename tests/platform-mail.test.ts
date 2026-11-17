import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import nodemailer from "nodemailer";
const directory = mkdtempSync(join(tmpdir(), "toc-outbox-")),
  original = { ...process.env };
let mail: typeof import("../lib/platform-mail"),
  store: typeof import("../lib/platform-store");
before(async () => {
  process.env.NEXT_PUBLIC_PREVIEW_MODE = "false";
  process.env.DATABASE_PATH = join(directory, "mail.sqlite");
  process.env.SMTP_PASS = "synthetic-mail-secret";
  process.env.SMTP_HOST = "mail.tocinvestment.co.tz";
  process.env.SMTP_USER = "info@tocinvestment.co.tz";
  process.env.SMTP_PORT = "465";
  process.env.SMTP_SECURE = "true";
  mail = await import("../lib/platform-mail");
  store = await import("../lib/platform-store");
});
after(() => {
  store?.platformDb().close();
  rmSync(directory, { recursive: true, force: true });
  for (const key of Object.keys(process.env))
    if (!(key in original)) delete process.env[key];
  Object.assign(process.env, original);
});
const clear = () =>
  store.platformDb().prepare("DELETE FROM notification_outbox").run();
test("outbox deduplication preserves a single stable delivery record", () => {
  clear();
  const first = mail.queueMail(
    "qa:event",
    "customer@example.test",
    "Synthetic event",
    "No live customer data.",
  );
  assert.equal(
    mail.queueMail(
      "qa:event",
      "customer@example.test",
      "Synthetic event",
      "No live customer data.",
    ),
    first,
  );
  assert.equal(
    (
      store
        .platformDb()
        .prepare("SELECT COUNT(*) AS n FROM notification_outbox")
        .get() as { n: number }
    ).n,
    1,
  );
});
test("worker sends using strict TLS and deterministic Message-ID, then records acceptance", async (t) => {
  clear();
  mail.queueMail(
    "qa:send",
    "customer@example.test",
    "Synthetic delivery",
    "QA only",
    "reply@example.test",
  );
  let envelope: Record<string, unknown> | undefined;
  const transport = t.mock.method(
    nodemailer,
    "createTransport",
    (options: unknown) => {
      assert.equal((options as { secure: boolean }).secure, true);
      assert.equal(
        (options as { tls: { rejectUnauthorized: boolean } }).tls
          .rejectUnauthorized,
        true,
      );
      return {
        sendMail: async (message: Record<string, unknown>) => {
          envelope = message;
          return { accepted: ["customer@example.test"] };
        },
        close() {},
      } as never;
    },
  );
  const result = await mail.processNotificationOutbox();
  assert.equal(result.sent, 1);
  assert.deepEqual(envelope?.replyTo, {
    address: "reply@example.test",
    name: "TOC inquiry customer",
  });
  assert.equal(transport.mock.callCount(), 1);
  assert.match(
    String(envelope?.messageId),
    /^<[a-f0-9]{64}@tocinvestment\.co\.tz>$/,
  );
  const row = store
    .platformDb()
    .prepare("SELECT state,attempts,sent_at FROM notification_outbox")
    .get() as { state: string; attempts: number; sent_at: string };
  assert.equal(row.state, "sent");
  assert.equal(row.attempts, 1);
  assert.ok(row.sent_at);
});
test("failed attempts use bounded retries without storing secrets or raw SMTP errors", async (t) => {
  clear();
  mail.queueMail(
    "qa:failure",
    "customer@example.test",
    "Synthetic failure",
    "QA only",
  );
  t.mock.method(
    nodemailer,
    "createTransport",
    () =>
      ({
        sendMail: async () => {
          throw new Error(
            "synthetic-mail-secret private-customer@example.test",
          );
        },
        close() {},
      }) as never,
  );
  for (let attempt = 1; attempt <= 5; attempt++) {
    const result = await mail.processNotificationOutbox();
    assert.equal(result.failed, 1);
    const row = store
      .platformDb()
      .prepare(
        "SELECT state,attempts,next_attempt_at,last_error FROM notification_outbox",
      )
      .get() as {
      state: string;
      attempts: number;
      next_attempt_at: number;
      last_error: string;
    };
    assert.equal(row.attempts, attempt);
    assert.equal(row.state, attempt === 5 ? "failed" : "retry");
    assert.ok(row.next_attempt_at > Date.now());
    assert.ok(!row.last_error.includes("synthetic-mail-secret"));
    store
      .platformDb()
      .prepare("UPDATE notification_outbox SET next_attempt_at=0")
      .run();
  }
  assert.equal((await mail.processNotificationOutbox()).failed, 0);
});
test("concurrent workers lease a message once and exhausted interrupted leases do not stick", async (t) => {
  clear();
  mail.queueMail(
    "qa:concurrent",
    "customer@example.test",
    "Synthetic event",
    "QA only",
  );
  let sends = 0;
  t.mock.method(
    nodemailer,
    "createTransport",
    () =>
      ({
        sendMail: async () => {
          sends++;
          await new Promise((resolve) => setTimeout(resolve, 10));
          return { accepted: ["customer@example.test"] };
        },
        close() {},
      }) as never,
  );
  await Promise.all([
    mail.processNotificationOutbox(),
    mail.processNotificationOutbox(),
  ]);
  assert.equal(sends, 1);
  store
    .platformDb()
    .prepare(
      "UPDATE notification_outbox SET state='sending',attempts=5,next_attempt_at=0",
    )
    .run();
  await mail.processNotificationOutbox();
  assert.equal(
    (
      store
        .platformDb()
        .prepare("SELECT state FROM notification_outbox")
        .get() as { state: string }
    ).state,
    "failed",
  );
  assert.equal(sends, 1);
});
test("missing SMTP credentials leave the queue durable and public URL must be HTTPS in production", async (t) => {
  clear();
  mail.queueMail(
    "qa:missing",
    "customer@example.test",
    "Synthetic event",
    "QA only",
  );
  const pass = process.env.SMTP_PASS;
  delete process.env.SMTP_PASS;
  const smtp = t.mock.method(nodemailer, "createTransport", () => {
    throw new Error("Must not connect");
  });
  const result = await mail.processNotificationOutbox();
  assert.ok("configured" in result);
  assert.equal(result.configured, false);
  assert.equal(smtp.mock.callCount(), 0);
  assert.equal(
    (
      store
        .platformDb()
        .prepare("SELECT state FROM notification_outbox")
        .get() as { state: string }
    ).state,
    "pending",
  );
  process.env.SMTP_PASS = pass;
  process.env.NEXT_PUBLIC_SITE_URL = "http://example.test";
  assert.throws(() => mail.applicationUrl());
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.test/subpath";
  assert.equal(mail.applicationUrl(), "https://example.test");
});
