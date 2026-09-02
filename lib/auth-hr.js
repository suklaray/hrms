// lib/auth-hr.js
import jwt from "jsonwebtoken";
import { parse } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Use the SAME session storage as authMiddleware
let sessions = new Map();
if (typeof global !== 'undefined') {
  if (!global.__hrms_sessions) {
    global.__hrms_sessions = new Map();
  }
  sessions = global.__hrms_sessions;
}

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes - match authMiddleware

// Endpoints that should NOT refresh session activity (same as authMiddleware)
const IGNORE_ACTIVITY_ENDPOINTS = [
  "/api/auth/me",
  "/api/auth/employee/me"
];

export async function verifyHRToken(req) {
  try {
    const cookies = parse(req.headers.cookie || "");
    const token = cookies.token;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded && decoded.id) {
      // Use SAME session key format as authMiddleware
      const userId = decoded.id;
      const userType = decoded.role === 'employee' ? 'employee' : 'admin';
      let sessionKey = `session_${userType}__${userId}`;
      
      // Refresh sessions reference in case it was updated
      if (typeof global !== 'undefined' && global.__hrms_sessions) {
        sessions = global.__hrms_sessions;
      }
      
      let session = sessions.get(`session_admin_${userId}`) || sessions.get(`session_employee_${userId}`);
      
      if (!session) {
        console.log(`No session found for user ${userId} during token verification`);
        return decoded; // Return decoded token payload so user info is available even if session store restarted
      }
      
      const currentTime = Date.now();
      const timeSinceLastActivity = currentTime - session.lastActivity;
      
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        console.log(`Session expired for user ${userId}. Inactive for ${Math.round(timeSinceLastActivity / 1000)} seconds`);
        sessions.delete(`session_admin_${userId}`);
        sessions.delete(`session_employee_${userId}`);
        return null;
      }
      
      // Only update session activity for meaningful user actions
      const shouldIgnoreActivity = IGNORE_ACTIVITY_ENDPOINTS.includes(req.url);
      
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
