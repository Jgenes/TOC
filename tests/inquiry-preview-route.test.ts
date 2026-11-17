import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import nodemailer from "nodemailer";
import { NextRequest } from "next/server";

test("the API saves preview submissions locally without using configured SMTP credentials", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "toc-inquiry-preview-"));
  const previous = {
    DATABASE_PATH: process.env.DATABASE_PATH,
    NEXT_PUBLIC_PREVIEW_MODE: process.env.NEXT_PUBLIC_PREVIEW_MODE,
    SMTP_PASS: process.env.SMTP_PASS,
  };
  const smtp = t.mock.method(nodemailer, "createTransport", () => ({
    async sendMail() {
      return { accepted: ["info@tocinvestment.co.tz"] };
    },
  }));
  let database: typeof import("../lib/database") | undefined;
  try {
    process.env.DATABASE_PATH = join(directory, "preview.sqlite");
    process.env.NEXT_PUBLIC_PREVIEW_MODE = "true";
    process.env.SMTP_PASS = "synthetic-test-password-not-a-real-secret";
    const { POST } = await import("../app/api/inquiries/route");
    database = await import("../lib/database");
    const response = await POST(
      new NextRequest("http://localhost:3000/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: "contact",
          service: "contact",
          name: "Synthetic Preview Customer",
          email: "preview-customer@example.test",
          message: "This preview request must stay in the local database.",
          consent: true,
        }),
      }),
    );
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(body.deliveryStatus, "preview_local_only");
    assert.equal(smtp.mock.callCount(), 0);
    assert.ok(
      database.listInquiries().some((row) => row.reference === body.reference),
    );
  } finally {
    database?.database().close();
    rmSync(directory, { recursive: true, force: true });
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
