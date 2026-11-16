import { NextRequest, NextResponse } from "next/server";
import { authenticated, privateHeaders, staffConfigured } from "@/lib/security";
import { listInquiries } from "@/lib/database";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!authenticated(request))
    return NextResponse.json(
      { error: "Please sign in.", configured: staffConfigured() },
      { status: 401, headers: privateHeaders },
    );
  return NextResponse.json(
    { inquiries: listInquiries() },
    { headers: privateHeaders },
  );
}
