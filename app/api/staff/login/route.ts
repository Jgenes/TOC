import { NextRequest, NextResponse } from "next/server";
import { isPreview } from "@/lib/content";
import {
  createStaffSession,
  passwordMatches,
  rateLimit,
  readJsonLimited,
  safeOrigin,
  staffConfigured,
  STAFF_COOKIE,
  privateHeaders,
} from "@/lib/security";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!isPreview)
    return NextResponse.json(
      {
        error:
          "Shared-password access is disabled in production. Use an individual account with MFA at /admin.",
      },
      { status: 403 },
    );
  if (!safeOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  if (!staffConfigured())
    return NextResponse.json(
      {
        error:
          "Staff access is not configured. The website operator must run npm run setup:staff or set STAFF_PASSWORD and SESSION_SECRET on the server.",
      },
      { status: 503 },
    );
  if (!rateLimit(request, "staff-login", 5, 15 * 60 * 1000))
    return NextResponse.json(
      { error: "Too many sign-in attempts. Try again in 15 minutes." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  try {
    const body = await readJsonLimited(request, 4096);
    if (
      typeof body.password !== "string" ||
      body.password.length > 256 ||
      !passwordMatches(body.password)
    )
      return NextResponse.json(
        { error: "That password was not recognized." },
        { status: 401, headers: privateHeaders },
      );
    const response = NextResponse.json(
      { ok: true },
      { headers: privateHeaders },
    );
    response.cookies.set(STAFF_COOKIE, createStaffSession(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Invalid sign-in request." },
      { status: 400 },
    );
  }
}
