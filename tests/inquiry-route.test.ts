import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import nodemailer, { type SendMailOptions } from "nodemailer";
import { NextRequest } from "next/server";

const directory = mkdtempSync(join(tmpdir(), "toc-inquiry-route-"));
const variables = [
  "DATABASE_PATH",
  "NEXT_PUBLIC_PREVIEW_MODE",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
] as const;
const original = Object.fromEntries(
  variables.map((key) => [key, process.env[key]]),
);
const recipient = "info@tocinvestment.co.tz";
let POST: typeof import("../app/api/inquiries/route").POST;
let database: typeof import("../lib/database");
let requestNumber = 0;

before(async () => {
  process.env.DATABASE_PATH = join(directory, "inquiries.sqlite");
  process.env.NEXT_PUBLIC_PREVIEW_MODE = "false";
  process.env.SMTP_HOST = "mail.tocinvestment.co.tz";
  process.env.SMTP_PORT = "465";
  process.env.SMTP_SECURE = "true";
  process.env.SMTP_USER = recipient;
  process.env.SMTP_PASS = "synthetic-test-password-not-a-real-secret";
  ({ POST } = await import("../app/api/inquiries/route"));
  database = await import("../lib/database");
});
after(() => {
  database?.database().close();
  rmSync(directory, { recursive: true, force: true });
  for (const key of variables) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

const contact = {
  origin: "contact",
  service: "contact",
  name: "Synthetic API Customer",
  email: "api-customer@example.test",
  message: "A synthetic contact request for the SMTP integration test.",
  consent: true,
};
function request(body: unknown, origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/inquiries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Host: "localhost:3000",
      Origin: origin,
      "X-Forwarded-For": `192.0.2.${++requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

test("contact submission is persisted before its email is sent", async (t) => {
  let sent: SendMailOptions | undefined;
  const smtp = t.mock.method(nodemailer, "createTransport", () => ({
    async sendMail(mail: SendMailOptions) {
      const saved = database
        .listInquiries()
        .find((row) => row.email === contact.email);
      assert.ok(saved, "Inquiry must already be durable when SMTP starts");
      assert.ok(String(mail.text).includes(saved.reference));
      const queued = database
        .database()
        .prepare(
          "SELECT state,attempts,reply_to,next_attempt_at FROM notification_outbox WHERE dedup_key=?",
        )
        .get(`staff-inquiry:${saved.id}`) as {
        state: string;
        attempts: number;
        reply_to: string;
        next_attempt_at: number;
      };
      assert.equal(queued.state, "sending");
      assert.equal(queued.attempts, 1);
      assert.equal(queued.reply_to, contact.email);
      assert.ok(queued.next_attempt_at > Date.now());
      assert.match(
        String(mail.messageId),
        /^<[a-f0-9]{64}@tocinvestment\.co\.tz>$/,
      );
      sent = mail;
      return { accepted: [recipient] };
    },
  }));
  const response = await POST(request(contact));
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.deliveryStatus, "email_sent");
  assert.match(body.reference, /^TOC-\d{4}-[A-F0-9]{8}$/);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(smtp.mock.callCount(), 1);
  assert.deepEqual(sent?.to, { name: "TOC inquiries", address: recipient });
  assert.deepEqual(sent?.replyTo, {
    name: contact.name,
    address: contact.email,
  });
});

test("quotation submissions use the same automatic notification path", async (t) => {
  const quotation = {
    ...contact,
    origin: "quotation",
    service: "event-management",
    phone: "+255 700 000 001",
    eventType: "Conference or workshop",
    region: "Dodoma",
    cateringRequired: "no",
    location: "Synthetic Dodoma venue",
    guestCount: 90,
    dateFlexible: true,
  };
  let text = "";
  t.mock.method(nodemailer, "createTransport", () => ({
    async sendMail(mail: SendMailOptions) {
      text = String(mail.text);
      return { accepted: [recipient] };
    },
  }));
  const response = await POST(request(quotation));
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.deliveryStatus, "email_sent");
  assert.ok(text.includes("New quotation request"));
  assert.ok(text.includes("Event management"));
  assert.ok(text.includes("Guests: 90"));
  assert.ok(
    database.listInquiries().some((row) => row.reference === body.reference),
  );
});

test("SMTP failure returns the saved reference, not an error that invites resubmission", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  t.mock.method(nodemailer, "createTransport", () => ({
    async sendMail() {
      throw new Error(
        `SMTP rejected ${process.env.SMTP_PASS} ${contact.email}`,
      );
    },
  }));
  const before = database.listInquiries().length;
  const response = await POST(request(contact));
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.deliveryStatus, "email_failed");
  assert.equal(database.listInquiries().length, before + 1);
  assert.ok(
    database.listInquiries().some((row) => row.reference === body.reference),
  );
  const failed = database
    .listInquiries()
    .find((row) => row.reference === body.reference)!;
  const queued = database
    .database()
    .prepare(
      "SELECT state,attempts,reply_to FROM notification_outbox WHERE dedup_key=?",
    )
    .get(`staff-inquiry:${failed.id}`) as {
    state: string;
    attempts: number;
    reply_to: string;
  };
  assert.equal(queued.state, "retry");
  assert.equal(queued.attempts, 1);
  assert.equal(queued.reply_to, contact.email);
  assert.equal(body.error, undefined);
  assert.ok(!JSON.stringify(body).includes(process.env.SMTP_PASS!));
  assert.ok(!JSON.stringify(log.mock.calls).includes(contact.email));
  assert.ok(!JSON.stringify(log.mock.calls).includes(process.env.SMTP_PASS!));
});

test("missing credentials save the form without connecting or claiming an email", async (t) => {
  t.mock.method(console, "warn", () => {});
  const smtp = t.mock.method(nodemailer, "createTransport", () => {
    throw new Error("Must not create an SMTP connection without credentials");
  });
  const password = process.env.SMTP_PASS;
  delete process.env.SMTP_PASS;
  try {
    const response = await POST(request(contact));
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(body.deliveryStatus, "saved_for_review");
    assert.equal(smtp.mock.callCount(), 0);
    assert.ok(
      database.listInquiries().some((row) => row.reference === body.reference),
    );
  } finally {
    process.env.SMTP_PASS = password;
  }
});

test("invalid forms, honeypots and cross-origin requests are never emailed or saved", async (t) => {
  const smtp = t.mock.method(nodemailer, "createTransport", () => {
    throw new Error("Invalid requests must not reach SMTP");
  });
  const before = database.listInquiries().length;
  assert.equal(
    (await POST(request({ ...contact, consent: false }))).status,
    422,
  );
  assert.equal(
    (await POST(request({ ...contact, website: "spam" }))).status,
    422,
  );
  assert.equal(
    (await POST(request({ ...contact, email: "invalid" }))).status,
    422,
  );
  assert.equal(
    (await POST(request(contact, "https://untrusted.example.test"))).status,
    403,
  );
  assert.equal(database.listInquiries().length, before);
  assert.equal(smtp.mock.callCount(), 0);
});

test("database failure prevents sending an untracked email", async (t) => {
  t.mock.method(console, "error", () => {});
  const smtp = t.mock.method(nodemailer, "createTransport", () => {
    throw new Error("An unsaved inquiry must not reach SMTP");
  });
  database.database().pragma("query_only = ON");
  try {
    const response = await POST(request(contact));
    assert.equal(response.status, 500);
    assert.equal(smtp.mock.callCount(), 0);
  } finally {
    database.database().pragma("query_only = OFF");
  }
});
