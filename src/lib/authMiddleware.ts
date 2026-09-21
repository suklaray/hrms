// src/lib/authMiddleware.ts
import jwt from "jsonwebtoken";
import * as cookie from "cookie";
import { DecodedToken } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const JWT_EXPIRY_SECONDS = 12 * 60 * 60; // 12 hours

interface SessionData {
  userId: number | string;
  userType: string;
  lastActivity: number;
  createdAt: number;
}

// Simple in-memory session store
let sessions = new Map<string, SessionData>();
if (typeof global !== 'undefined') {
  if (!(global as any).__hrms_sessions) {
    (global as any).__hrms_sessions = new Map<string, SessionData>();
  }
  sessions = (global as any).__hrms_sessions;
}

export function verifyToken(req: any, res?: any): DecodedToken | null {
  const authHeader = req?.headers?.authorization || (typeof req?.headers?.get === 'function' ? req.headers.get('authorization') : null);

  if (!authHeader) {
    if (res?.status) res.status(401).json({ error: "No token provided" });
    return null;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch {
    if (res?.status) res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}

export function withSessionTimeout(handler: any) {
  return async (req: any, res: any) => {
    const IGNORE_ACTIVITY_ENDPOINTS = [
      "/api/auth/me",
      "/api/auth/employee/me"
    ];
    
    const shouldIgnoreActivity = IGNORE_ACTIVITY_ENDPOINTS.includes(req.url);
    const cookieHeader = req.headers?.cookie || (typeof req?.headers?.get === 'function' ? req.headers.get('cookie') : '');
    const cookies = cookieHeader ? cookie.parse(cookieHeader) : {};
    const token = cookies.token;

    if (!token) {
      return res.status(401).json({ error: "No authentication token" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
      const userId = decoded.id;
      const userType = decoded.role === 'employee' ? 'employee' : 'admin';
      const sessionKey = `session_${userType}_${userId}`;
      
      const currentTime = Date.now();
      const session = sessions.get(sessionKey);
      
      if (!session) {
        if (res?.setHeader) {
          res.setHeader("Set-Cookie", cookie.serialize("token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            expires: new Date(0),
            path: "/",
          }));
        }
        return res.status(401).json({ error: "No active session found" });
      }
      
      const timeSinceLastActivity = currentTime - session.lastActivity;
      
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        sessions.delete(sessionKey);
        
        if (res?.setHeader) {
          res.setHeader("Set-Cookie", cookie.serialize("token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            expires: new Date(0),
            path: "/",
          }));
        }
        return res.status(401).json({ error: "Session expired due to inactivity" });
      }

      if (!shouldIgnoreActivity) {
        sessions.set(sessionKey, {
          ...session,
          lastActivity: currentTime
        });
      }

      req.user = decoded;
      return handler(req, res);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

export const SESSION_CONFIG = {
  TIMEOUT: SESSION_TIMEOUT,
  JWT_EXPIRY: JWT_EXPIRY_SECONDS * 1000,
  WARNING_OFFSET: 60 * 1000
};

export function createSession(userId: number | string, userType: string = 'admin') {
  const sessionKey = `session_${userType}_${userId}`;
  
  const sessionData: SessionData = {
    userId,
    userType,
    lastActivity: Date.now(),
    createdAt: Date.now()
  };
  
  sessions.set(sessionKey, sessionData);
  
  if (typeof global !== 'undefined') {
    (global as any).__hrms_sessions = sessions;
  }
}

export function destroySession(userId: number | string, userType: string = 'admin') {
  const sessionKey = `session_${userType}_${userId}`;
  return sessions.delete(sessionKey);
}

export function debugSessions() {
  console.log("Active sessions:", Array.from(sessions.entries()));
}
