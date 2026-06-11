import jwt from "jsonwebtoken";
import cookie from "cookie";

const JWT_SECRET = process.env.JWT_SECRET;

// Use the same session storage as authMiddleware
let sessions = new Map();
if (typeof global !== 'undefined') {
  if (!global.__hrms_sessions) {
    global.__hrms_sessions = new Map();
  }
  sessions = global.__hrms_sessions;
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    
    if (typeof global !== 'undefined' && global.__hrms_sessions) {
      sessions = global.__hrms_sessions;
    }
    
    const session = sessions.get(sessionKey);
    
    if (!session) {
      return res.status(401).json({ error: "No active session found" });
    }
    
    // Update session activity
    sessions.set(sessionKey, {
      ...session,
      lastActivity: Date.now()
    });
    
    return res.status(200).json({ 
      success: true,
      message: "Session activity updated"
    });
    
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}