// src/lib/auth-hr.ts
import jwt from "jsonwebtoken";
import * as cookie from "cookie";
const parse = cookie.parse;
import { DecodedToken } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

let sessions = new Map<string, any>();
if (typeof global !== 'undefined') {
  if (!(global as any).__hrms_sessions) {
    (global as any).__hrms_sessions = new Map<string, any>();
  }
  sessions = (global as any).__hrms_sessions;
}

const SESSION_TIMEOUT = 5 * 60 * 1000;

const IGNORE_ACTIVITY_ENDPOINTS = [
  "/api/auth/me",
  "/api/auth/employee/me"
];

export async function verifyHRToken(req: any): Promise<DecodedToken | null> {
  try {
    const cookieHeader = req?.headers?.cookie || (typeof req?.headers?.get === 'function' ? req.headers.get('cookie') : '') || '';
    const cookies = parse(cookieHeader);
    const token = cookies.token;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

    if (decoded && decoded.id) {
      const userId = decoded.id;
      if (typeof global !== 'undefined' && (global as any).__hrms_sessions) {
        sessions = (global as any).__hrms_sessions;
      }
      
      let session = sessions.get(`session_admin_${userId}`) || sessions.get(`session_employee_${userId}`);
      
      if (!session) {
        return decoded;
      }
      
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - session.lastActivity;
      
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        sessions.delete(`session_admin_${userId}`);
        sessions.delete(`session_employee_${userId}`);
        return null;
      }
      
      const url = req?.url || req?.nextUrl?.pathname || '';
      const shouldIgnoreActivity = IGNORE_ACTIVITY_ENDPOINTS.includes(url);
      
      if (!shouldIgnoreActivity) {
        session.lastActivity = currentTime;
      }
      
      return decoded;
    }

    return null;
  } catch (err) {
    console.error("HR JWT verification failed:", err);
    return null;
  }
}

export default verifyHRToken;
