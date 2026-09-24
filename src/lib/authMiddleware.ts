import jwt, { JwtPayload } from "jsonwebtoken";
import cookie from "cookie";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { DecodedToken } from "@/types";
import { SESSION_TIMEOUT_MS } from "@/lib/sessionConfig";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";
const SESSION_TIMEOUT = SESSION_TIMEOUT_MS;
const IGNORE_ACTIVITY_ENDPOINTS = ["/api/auth/me", "/api/auth/employee/me"];
// Only update session if last activity was more than this threshold ago.
// Prevents concurrent requests from hammering the same DB row simultaneously.
const SESSION_REFRESH_DEBOUNCE_MS = 30 * 1000;

function getDecodedToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === "string" || !decoded || typeof decoded !== "object") {
      return null;
    }

    return decoded as JwtPayload as DecodedToken;
  } catch {
    return null;
  }
}

export function isActiveUserStatus(status: string) {
  return status === "Active" || status === "Logged In";
}

export async function refreshSessionActivity(session: any) {
  if (!session) return false;

  const now = Date.now();
  const lastActivity = session.lastActivity instanceof Date
    ? session.lastActivity.getTime()
    : new Date(session.lastActivity).getTime();

  // Skip update if session was already refreshed recently — debounces concurrent requests
  if (now - lastActivity < SESSION_REFRESH_DEBOUNCE_MS) return true;

  try {
    const updatedSession = await prisma.session.update({
      where: { id: session.id },
      data: {
        lastActivity: new Date(now),
        expiresAt: new Date(now + SESSION_TIMEOUT),
      },
    });
    session.lastActivity = updatedSession.lastActivity;
    session.expiresAt = updatedSession.expiresAt;
    return true;
  } catch (err: any) {
    // Transient DB error (ECONNRESET etc.) — session is still valid, just skip this refresh
    console.warn("Session activity touch failed; auth still valid:", {
      sessionId: session.id,
      code: err?.code,
      message: err?.message,
    });
    return false;
  }
}

export function verifyToken(req: any, res?: any): DecodedToken | null {
  const authHeader = req?.headers?.authorization || (typeof req?.headers?.get === "function" ? req.headers.get("authorization") : null);

  if (!authHeader) {
    if (res?.status) res.status(401).json({ error: "No token provided" });
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    return getDecodedToken(token);
  } catch {
    if (res?.status) res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}

export function clearAuthCookies(res: any) {
  const expiredCookie = (name: string) =>
    cookie.serialize(name, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });

  if (!res || typeof res.setHeader !== "function") return;

  res.setHeader("Set-Cookie", [expiredCookie("token"), expiredCookie("sessionToken")]);
}

export function refreshSessionCookie(res: any, sessionToken: string, expiresAt: Date | string) {
  if (!res || !sessionToken || !expiresAt) return;

  const maxAgeSeconds = Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
  const sessionCookie = cookie.serialize("sessionToken", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeSeconds,
  });

  const existingCookies = res.getHeader("Set-Cookie");
  const nextCookies = Array.isArray(existingCookies)
    ? [...existingCookies, sessionCookie]
    : existingCookies
      ? [existingCookies, sessionCookie]
      : [sessionCookie];

  res.setHeader("Set-Cookie", nextCookies);
}

async function validateSessionRequest(req: NextRequest): Promise<{
  decoded: DecodedToken | null;
  session: any | null;
  errorResponse: NextResponse | null;
}> {
  const pathname = req.nextUrl?.pathname || req.url || "";
  const shouldIgnoreActivity = IGNORE_ACTIVITY_ENDPOINTS.some((ep: string) => pathname.endsWith(ep));
  const cookieHeader =
    req.headers && typeof (req.headers as any).get === "function"
      ? (req.headers as any).get("cookie") || ""
      : "";
  const cookies = cookieHeader ? cookie.parse(cookieHeader) : {};
  const token = cookies.token || (req.cookies && typeof req.cookies.get === "function" ? req.cookies.get("token")?.value : undefined);
  const sessionToken = cookies.sessionToken || (req.cookies && typeof req.cookies.get === "function" ? req.cookies.get("sessionToken")?.value : undefined);

  if (!token || !sessionToken) {
    const response = NextResponse.json({ error: "Authentication cookies are required" }, { status: 401 });
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("sessionToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });
    return { decoded: null, session: null, errorResponse: response };
  }

  const decoded = getDecodedToken(token);
  if (!decoded) {
    const response = NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("sessionToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });
    return { decoded: null, session: null, errorResponse: response };
  }

  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session || !session.user) {
    const response = NextResponse.json({ error: "No active session found" }, { status: 401 });
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("sessionToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });
    return { decoded: null, session: null, errorResponse: response };
  }

  if (session.userId !== Number(decoded.id)) {
    const response = NextResponse.json({ error: "Session does not match token" }, { status: 401 });
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("sessionToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });
    return { decoded: null, session: null, errorResponse: response };
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { id: session.id } }).catch(() => undefined);
    const response = NextResponse.json({ error: "Session expired due to inactivity" }, { status: 401 });
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });
    response.cookies.set("sessionToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      expires: new Date(0),
      path: "/",
    });
    return { decoded: null, session: null, errorResponse: response };
  }

  if (!shouldIgnoreActivity) {
    await refreshSessionActivity(session).catch(() => undefined);
  }

  return { decoded, session, errorResponse: null };
}

export async function getAuthenticatedUser(req: NextRequest): Promise<{
  user: DecodedToken | null;
  errorResponse: NextResponse | null;
}> {
  const result = await validateSessionRequest(req);
  if (result.errorResponse) {
    return { user: null, errorResponse: result.errorResponse };
  }

  return { user: result.decoded, errorResponse: null };
}

export function withSessionTimeout(handler: any) {
  return async (req: any, resOrContext?: any) => {
    const isAppRouter = req instanceof Request || (req && req.nextUrl) || (!resOrContext || typeof resOrContext.status !== "function");

    if (isAppRouter) {
      const context = resOrContext;
      const validated = await validateSessionRequest(req);
      if (validated.errorResponse) {
        return validated.errorResponse;
      }

      req.user = validated.decoded;
      req.session = validated.session;
      return handler(req, context);
    }

    const res = resOrContext;
    const cookies = req.headers?.cookie ? cookie.parse(req.headers.cookie) : {};
    const token = cookies.token;
    const sessionToken = cookies.sessionToken;

    if (!token || !sessionToken) {
      clearAuthCookies(res);
      return res.status(401).json({ error: "Authentication cookies are required" });
    }

    try {
      const decoded = getDecodedToken(token);
      if (!decoded) {
        clearAuthCookies(res);
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (!session || !session.user || session.userId !== Number(decoded.id)) {
        clearAuthCookies(res);
        return res.status(401).json({ error: "No active session found" });
      }

      if (session.expiresAt.getTime() <= Date.now()) {
        await prisma.session.deleteMany({ where: { id: session.id } });
        clearAuthCookies(res);
        return res.status(401).json({ error: "Session expired due to inactivity" });
      }

      req.user = decoded;
      req.session = session;
      return handler(req, res);
    } catch (err) {
      console.error("Session validation error:", err);
      clearAuthCookies(res);
      return res.status(401).json({ error: "Invalid or expired session" });
    }
  };
}

export default {
  verifyToken,
  getAuthenticatedUser,
  withSessionTimeout,
  clearAuthCookies,
  refreshSessionActivity,
  refreshSessionCookie,
};
