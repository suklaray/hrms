import { NextRequest, NextResponse } from "next/server";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { refreshSessionActivity } from "@/lib/authMiddleware";
import { SESSION_TIMEOUT_MS } from "@/lib/sessionConfig";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = cookieHeader ? cookie.parse(cookieHeader) : {};
    const token = cookies.token;
    const sessionToken = cookies.sessionToken;

    if (!token || !sessionToken) {
      return NextResponse.json({ error: "Authentication cookies are required" }, { status: 401 });
    }

    let decoded: { id?: number | string; role?: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { id?: number | string; role?: string };
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || !session.user) {
      await prisma.session.deleteMany({ where: { sessionToken } }).catch(() => undefined);
      return NextResponse.json({ error: "No active session found" }, { status: 401 });
    }

    if (session.userId !== Number(decoded.id)) {
      return NextResponse.json({ error: "Session does not match token" }, { status: 401 });
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await prisma.session.deleteMany({ where: { id: session.id } }).catch(() => undefined);
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const refreshed = await refreshSessionActivity(session);
    if (!refreshed) {
      return NextResponse.json({ error: "Unable to refresh session" }, { status: 500 });
    }

    const updatedSession = await prisma.session.findUnique({
      where: { id: session.id },
      include: { user: true },
    });

    if (!updatedSession) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    const expiresAt = new Date(updatedSession.expiresAt);
    return NextResponse.json({
      success: true,
      lastActivity: updatedSession.lastActivity.toISOString(),
      expiresAt: expiresAt.toISOString(),
      remainingMs: Math.max(0, expiresAt.getTime() - Date.now()),
      sessionTimeoutMs: SESSION_TIMEOUT_MS,
    }, { status: 200 });
  } catch (error) {
    console.error("Session activity error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
