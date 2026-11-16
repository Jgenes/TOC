import { NextRequest, NextResponse } from "next/server";
import { inquirySchema } from "@/lib/inquiry";
import { saveInquiry } from "@/lib/database";
import { rateLimit, readJsonLimited, safeOrigin } from "@/lib/security";
import { isPreview } from "@/lib/content";
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
    const saved = saveInquiry(result.data);
    return NextResponse.json(
      {
        reference: saved.reference,
        createdAt: saved.createdAt,
        deliveryStatus: isPreview ? "preview_local_only" : "saved_for_review",
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
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
