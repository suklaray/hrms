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

export async function verifyEmployeeToken(req) {
  try {
    const cookies = parse(req.headers.cookie || "");
    const token = cookies.token; 
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "employee") return null;

    // Use SAME session key format as authMiddleware
    const userId = decoded.id;
    const sessionKey = `session_employee_${userId}`;
    const currentTime = Date.now();
    
    // Refresh sessions reference in case it was updated
    if (typeof global !== 'undefined' && global.__hrms_sessions) {
      sessions = global.__hrms_sessions;
    }
    
    const session = sessions.get(sessionKey);
    
    if (!session) {
      console.log(`No session found for employee ${userId} during token verification`);
      return null;
    }
    
    const timeSinceLastActivity = currentTime - session.lastActivity;
    
    if (timeSinceLastActivity > SESSION_TIMEOUT) {
      console.log(`Session expired for employee ${userId}. Inactive for ${Math.round(timeSinceLastActivity / 1000)} seconds (limit: ${SESSION_TIMEOUT / 1000}s)`);
      sessions.delete(sessionKey);
      return null;
    }
    
    // Only update session activity for meaningful user actions (same logic as authMiddleware)
    const shouldIgnoreActivity = IGNORE_ACTIVITY_ENDPOINTS.includes(req.url);
    
    if (!shouldIgnoreActivity) {
      sessions.set(sessionKey, {
        ...session,
        lastActivity: currentTime
      });
      console.log(`[SESSION REFRESH] Employee ${userId} session activity updated via verifyEmployeeToken`);
    } else {
      console.log(`[SESSION SKIPPED] Employee ${userId} activity ignored for ${req.url}`);
    }

    return decoded;
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}
