import { NextRequest, NextResponse } from "next/server";
import { safeOrigin, STAFF_COOKIE, privateHeaders } from "@/lib/security";
export async function POST(request: NextRequest) {
  if (!safeOrigin(request))
    return NextResponse.json(
      { error: "Invalid request origin." },
      { status: 403 },
    );
  const response = NextResponse.json({ ok: true }, { headers: privateHeaders });
  response.cookies.set(STAFF_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
