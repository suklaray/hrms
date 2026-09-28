import { NextRequest, NextResponse } from "next/server";
import cookie from "cookie";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = cookieHeader ? cookie.parse(cookieHeader) : {};
  const sessionToken = cookies.sessionToken;

  if (!sessionToken) {
    return NextResponse.json({ valid: false, reason: "missing_session_token" }, { status: 401 });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || !session.user) {
      await prisma.session.deleteMany({ where: { sessionToken } }).catch(() => undefined);
      return NextResponse.json({ valid: false, reason: "session_not_found" }, { status: 401 });
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.session.deleteMany({ where: { id: session.id } }).catch(() => undefined);
      return NextResponse.json({ valid: false, reason: "session_expired" }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      expiresAt: session.expiresAt.toISOString(),
      remainingMs: Math.max(0, session.expiresAt.getTime() - Date.now()),
    }, { status: 200 });
  } catch (error) {
    console.error("Session status error:", error);
    return NextResponse.json({ valid: false, error: "Internal error" }, { status: 500 });
  }
}
