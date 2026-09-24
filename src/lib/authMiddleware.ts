import jwt, { JwtPayload } from "jsonwebtoken";
import cookie from "cookie";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { DecodedToken } from "@/types";
import {
  SESSION_CONFIG as SHARED_SESSION_CONFIG,
  SESSION_TIMEOUT_MS,
} from "@/lib/sessionConfig";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";
const SESSION_TIMEOUT = SESSION_TIMEOUT_MS;
const JWT_EXPIRY_SECONDS = 12 * 60 * 60; // 12 hours
const SESSION_ACTIVITY_RETRY_MS = 250;
const sessionRefreshLocks = new Map<string, boolean>();
const IGNORE_ACTIVITY_ENDPOINTS = ["/api/auth/me", "/api/auth/employee/me"];

interface SessionData {
  userId: number | string;
  userType: string;
  lastActivity: number;
  createdAt: number;
}

let sessions = new Map<string, SessionData>();
if (typeof global !== "undefined") {
  if (!(global as any).__hrms_sessions) {
    (global as any).__hrms_sessions = new Map<string, SessionData>();
  }
  sessions = (global as any).__hrms_sessions;
}

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

  if (sessionRefreshLocks.has(session.id)) {
    return true;
  }

  sessionRefreshLocks.set(session.id, true);

  try {
    const now = Date.now();
    const newExpiresAt = new Date(now + SESSION_TIMEOUT);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const updatedSession = await prisma.session.update({
          where: { id: session.id },
          data: {
            lastActivity: new Date(now),
            expiresAt: newExpiresAt,
          },
        });

        session.lastActivity = updatedSession.lastActivity;
        session.expiresAt = updatedSession.expiresAt;
        return true;
      } catch (err: any) {
        const isTransientDbError =
          err?.code === "ECONNRESET" ||
          err?.code === "ETIMEDOUT" ||
          /ECONNRESET|ETIMEDOUT|Connection reset|Connection terminated/i.test(
            err?.message || ""
          );

        if (!isTransientDbError || attempt === 3) {
          console.warn("Session activity touch failed; auth still valid:", {
            sessionId: session.id,
            userId: session.userId,
            code: err?.code,
            message: err?.message,
            attempt,
          });
          return false;
        }

        await new Promise((resolve) => setTimeout(resolve, SESSION_ACTIVITY_RETRY_MS * attempt));
      }
    }

    return false;
  } finally {
    sessionRefreshLocks.delete(session.id);
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

export const SESSION_CONFIG = SHARED_SESSION_CONFIG;

export function createSession(userId: number | string, userType: string = "admin") {
  const sessionKey = `session_${userType}_${userId}`;

  const sessionData: SessionData = {
    userId,
    userType,
    lastActivity: Date.now(),
    createdAt: Date.now(),
  };

  sessions.set(sessionKey, sessionData);

  if (typeof global !== "undefined") {
    (global as any).__hrms_sessions = sessions;
  }
}

export async function destroySession(sessionTokenOrUserId: string | number, userType?: string) {
  if (typeof sessionTokenOrUserId === "string" && userType === undefined) {
    if (!sessionTokenOrUserId) return 0;
    if (prisma?.session?.deleteMany) {
      const result = await prisma.session.deleteMany({ where: { sessionToken: sessionTokenOrUserId } });
      return result.count;
    }
    return 0;
  }

  const sessionKey = `session_${userType || "admin"}_${sessionTokenOrUserId}`;
  sessions.delete(sessionKey);
  return 1;
}

export async function debugSessions() {
  const dbSessions = await prisma.session.findMany({ include: { user: true } });
  console.log("Active database sessions:", dbSessions);
  return dbSessions;
}

export default {
  verifyToken,
  getAuthenticatedUser,
  withSessionTimeout,
  createSession,
  destroySession,
  debugSessions,
  SESSION_CONFIG,
  clearAuthCookies,
  refreshSessionActivity,
  refreshSessionCookie,
};
