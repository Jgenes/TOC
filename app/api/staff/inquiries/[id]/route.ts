import { NextRequest, NextResponse } from "next/server";
import {
  authenticated,
  privateHeaders,
  readJsonLimited,
  safeOrigin,
} from "@/lib/security";
import { changeInquiryStatus } from "@/lib/database";
import { inquiryStatuses, type InquiryStatus } from "@/lib/inquiry";
export const runtime = "nodejs";
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!authenticated(request))
    return NextResponse.json(
      { error: "Please sign in." },
      { status: 401, headers: privateHeaders },
    );
  if (!safeOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  try {
    const { id } = await params;
    const input = await readJsonLimited(request, 2048);
    if (!inquiryStatuses.includes(input.status))
      return NextResponse.json({ error: "Invalid status." }, { status: 422 });
    const result = changeInquiryStatus(id, input.status as InquiryStatus);
    if ("error" in result)
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers: privateHeaders },
      );
    return NextResponse.json(result, { headers: privateHeaders });
  } catch {
    return NextResponse.json(
      { error: "The update could not be saved." },
      { status: 400, headers: privateHeaders },
    );
  }
}
