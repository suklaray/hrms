// lib/authMiddleware.js
import jwt from "jsonwebtoken";
import cookie from "cookie";

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const JWT_EXPIRY_SECONDS = 12 * 60 * 60; // 12 hours

// Simple in-memory session store
let sessions = new Map();
if (typeof global !== 'undefined') {
  if (!global.__hrms_sessions) {
    global.__hrms_sessions = new Map();
  }
  sessions = global.__hrms_sessions;
}

export function verifyToken(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "No token provided" });
    return null;
  }

  const token = authHeader.split(" ")[1]; // Expecting "Bearer <token>"

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; // return decoded user info
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
    return null;
  }
}

// Enhanced middleware with server-side session timeout
export function withSessionTimeout(handler) {
  return async (req, res) => {
    // Endpoints that should NOT refresh session activity
    const IGNORE_ACTIVITY_ENDPOINTS = [
      "/api/auth/me",
      "/api/auth/employee/me"
    ];
    
    const shouldIgnoreActivity = IGNORE_ACTIVITY_ENDPOINTS.includes(req.url);
    
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    const token = cookies.token;

    if (!token) {
      return res.status(401).json({ error: "No authentication token" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.id;
      const userType = decoded.role === 'employee' ? 'employee' : 'admin';
      const sessionKey = `session_${userType}_${userId}`;
      
      const currentTime = Date.now();
      const session = sessions.get(sessionKey);
      
      if (!session) {
        res.setHeader("Set-Cookie", cookie.serialize("token", "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          expires: new Date(0),
          path: "/",
        }));
        return res.status(401).json({ error: "No active session found" });
      }
      
      const timeSinceLastActivity = currentTime - session.lastActivity;
      
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        sessions.delete(sessionKey);
        
        res.setHeader("Set-Cookie", cookie.serialize("token", "", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          expires: new Date(0),
          path: "/",
        }));
        return res.status(401).json({ error: "Session expired due to inactivity" });
      }

      // Update session activity for meaningful actions
      if (!shouldIgnoreActivity) {
        sessions.set(sessionKey, {
          ...session,
          lastActivity: currentTime
        });
      }

      req.user = decoded;
      return handler(req, res);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

// Export session configuration
export const SESSION_CONFIG = {
  TIMEOUT: SESSION_TIMEOUT,
  JWT_EXPIRY: JWT_EXPIRY_SECONDS * 1000,
  WARNING_OFFSET: 60 * 1000
};

// Create session on login
export function createSession(userId, userType = 'admin') {
  const sessionKey = `session_${userType}_${userId}`;
  
  const sessionData = {
    userId,
    userType,
    lastActivity: Date.now(),
    createdAt: Date.now()
  };
  
  sessions.set(sessionKey, sessionData);
  
  if (typeof global !== 'undefined') {
    global.__hrms_sessions = sessions;
  }
}

// Destroy session on logout
export function destroySession(userId, userType = 'admin') {
  const sessionKey = `session_${userType}_${userId}`;
  return sessions.delete(sessionKey);
}
