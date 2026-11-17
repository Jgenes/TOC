import { NextRequest, NextResponse } from "next/server";
import { inquirySchema } from "@/lib/inquiry";
import { saveInquiry } from "@/lib/database";
import { rateLimit, readJsonLimited, safeOrigin } from "@/lib/security";
import { randomUUID, createHash } from "node:crypto";
import { platformDb, PlatformError } from "@/lib/platform-store";
import {
  createInquiryClaim,
  inquiryById,
  resolvePublicPriceSelections,
  calculateQuote,
} from "@/lib/platform-business";
import { publicBundle } from "@/lib/platform-cms";
import { applicationUrl, queueMail } from "@/lib/platform-mail";
import { isPreview, company } from "@/lib/content";
import { buildInquiryEmail, notifyInquiry } from "@/lib/inquiry-email";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!safeOrigin(request))
    return NextResponse.json(
      { error: "Request origin is not permitted." },
      { status: 403 },
    );
  if (!rateLimit(request, "inquiry"))
    return NextResponse.json(
      {
        error:
          "Too many requests. Please try again in 30 minutes or contact the team directly.",
      },
      { status: 429, headers: { "Retry-After": "1800" } },
    );
  try {
    const input = await readJsonLimited(request);
    const result = inquirySchema.safeParse(input);
    if (!result.success) {
      const fields: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = String(issue.path[0]);
        if (!fields[key]) fields[key] = issue.message;
      });
      return NextResponse.json(
        {
          error:
            "Please check the highlighted details. If you have returned to an earlier step, review those fields too.",
          fields,
        },
        { status: 422 },
      );
    }
    const published = new Set(
      publicBundle().catalog.map((service) => String(service.slug)),
    );
    if (
      (!["contact", "not-sure"].includes(result.data.service) &&
        !published.has(result.data.service)) ||
      result.data.additionalServices.some((service) => !published.has(service))
    )
      return NextResponse.json(
        {
          error:
            "That service is not currently published. Please choose a listed service.",
        },
        { status: 422 },
      );
    const key = request.headers.get("Idempotency-Key");
    if (key && !/^[a-zA-Z0-9_-]{16,128}$/.test(key))
      return NextResponse.json(
        { error: "Invalid submission key." },
        { status: 400 },
      );
    const hash = (value: string) =>
        createHash("sha256").update(value).digest("hex"),
      payloadHash = hash(JSON.stringify(result.data)),
      db = platformDb();
    // The inquiry, routing, customer acknowledgement and retry key are durable together.
    const receipt = db.transaction(() => {
      if (key) {
        const previous = db
          .prepare(
            "SELECT payload_hash,result_json FROM inquiry_submission_keys WHERE key_hash=?",
          )
          .get(hash(key)) as
          { payload_hash: string; result_json: string } | undefined;
        if (previous) {
          if (previous.payload_hash !== payloadHash)
            throw new PlatformError(
              409,
              "This submission key already belongs to different requirements. Start a new inquiry.",
            );
          return { replayed: JSON.parse(previous.result_json) };
        }
      }
      if (result.data.pricingSelections.length) {
        try {
          const items = resolvePublicPriceSelections(
            result.data.pricingSelections,
            result.data.service,
          );
          calculateQuote({ items, discountBps: 0 });
        } catch {
          throw new PriceSelectionError();
        }
      }
      const saved = saveInquiry(result.data),
        inquiry = inquiryById(saved.id),
        claim = createInquiryClaim(inquiry);
      let link = "";
      try {
        link = `${applicationUrl(request.nextUrl.origin)}/portal/claim?token=${claim}`;
      } catch {
        /* Staff notification still works when a deployment has not set its public URL. */
      }
      queueMail(
        `inquiry-ack:${saved.id}`,
        result.data.email,
        `[${saved.reference}] Your TOC inquiry`,
        `${company.name}\n\nYour inquiry has been saved. Reference: ${saved.reference}. This is not a quotation or a confirmed booking.\n\n${link ? `To track it securely, register and verify an account with this email, sign in, then open this one-time claim link (valid seven days):\n${link}` : "Contact TOC for a secure customer-portal claim link when account email is configured."}\n\nNever send passwords, API keys or private credentials.\n${company.email}`,
      );
      const staffKey = `staff-inquiry:${saved.id}`;
      const staffEmail = buildInquiryEmail(
        result.data,
        saved,
        process.env.SMTP_USER || company.email,
      );
      const staffMailId = queueMail(
        staffKey,
        company.email,
        String(staffEmail.subject),
        String(staffEmail.text),
        result.data.email,
      );
      // Lease the durable notification before the immediate attempt. A crash is
      // recovered by the worker; SMTP itself is necessarily at-least-once.
      if (!isPreview)
        db.prepare(
          "UPDATE notification_outbox SET state='sending',attempts=?,next_attempt_at=? WHERE id=?",
        ).run(process.env.SMTP_PASS ? 1 : 0, Date.now() + 120000, staffMailId);
      const initial = {
        reference: saved.reference,
        createdAt: saved.createdAt,
        deliveryStatus: isPreview ? "preview_local_only" : "saved_for_review",
        ...(isPreview
          ? { previewClaimPath: `/portal/claim?token=${claim}` }
          : {}),
      };
      if (key)
        db.prepare(
          "INSERT INTO inquiry_submission_keys(key_hash,payload_hash,inquiry_id,result_json,created_at) VALUES(?,?,?,?,?)",
        ).run(
          hash(key),
          payloadHash,
          saved.id,
          JSON.stringify(initial),
          saved.createdAt,
        );
      return { saved, initial, staffMailId, staffKey };
    })();
    if (receipt.replayed)
      return NextResponse.json(receipt.replayed, {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
          "Idempotency-Replayed": "true",
        },
      });
    const saved = receipt.saved!;
    // Persist first: an SMTP failure must not lose the inquiry or invite a duplicate.
    const sender = process.env.SMTP_USER || company.email;
    const messageId = `<${hash(receipt.staffKey!)}@${sender.split("@")[1] || "tocinvestment.co.tz"}>`;
    const deliveryStatus = await notifyInquiry(result.data, saved, {
      messageId,
    });
    const response = { ...receipt.initial, deliveryStatus };
    try {
      db.transaction(() => {
        db.prepare(
          "INSERT INTO delivery_attempts(id,inquiry_id,channel,outcome,created_at) VALUES(?,?,?,?,?)",
        ).run(
          randomUUID(),
          saved.id,
          "staff-email",
          deliveryStatus,
          new Date().toISOString(),
        );
        const state =
          deliveryStatus === "email_sent"
            ? "sent"
            : deliveryStatus === "email_failed"
              ? "retry"
              : deliveryStatus === "preview_local_only"
                ? "preview"
                : "pending";
        db.prepare(
          "UPDATE notification_outbox SET state=?,sent_at=?,last_error=?,next_attempt_at=? WHERE id=?",
        ).run(
          state,
          deliveryStatus === "email_sent" ? new Date().toISOString() : null,
          deliveryStatus === "email_failed"
            ? "SMTP delivery attempt failed"
            : null,
          deliveryStatus === "email_failed" ? Date.now() + 60000 : 0,
          receipt.staffMailId!,
        );
        if (key)
          db.prepare(
            "UPDATE inquiry_submission_keys SET result_json=? WHERE key_hash=?",
          ).run(JSON.stringify(response), hash(key));
      })();
    } catch {
      console.error(
        "Inquiry saved; delivery bookkeeping needs operator review.",
        { reference: saved.reference },
      );
    }
    return NextResponse.json(response, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof PriceSelectionError)
      return NextResponse.json(
        { error: error.message, fields: { pricingSelections: error.message } },
        { status: 422 },
      );
    if (error instanceof PlatformError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    const kind = error instanceof Error ? error.message : "";
    if (kind === "TOO_LARGE")
      return NextResponse.json(
        { error: "Your request is too large. Please shorten the message." },
        { status: 413 },
      );
    if (kind === "INVALID_JSON" || kind === "CONTENT_TYPE")
      return NextResponse.json(
        { error: "Please send a valid JSON request." },
        { status: 400 },
      );
    console.error("Inquiry could not be stored. No customer data logged.");
    return NextResponse.json(
      {
        error:
          "We couldn’t save your request. Please try again, or contact TOC directly.",
      },
      { status: 500 },
    );
  }
}

class PriceSelectionError extends Error {
  constructor() {
    super(
      "A selected public rate is no longer available for this division. Review or remove the optional estimate choices; your request has not been submitted yet.",
    );
  }
}
