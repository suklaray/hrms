import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import cookie from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "";

// Use the same session storage as authMiddleware
let sessions = new Map();
if (typeof global !== 'undefined') {
  if (!(global as any).__hrms_sessions) {
    (global as any).__hrms_sessions = new Map();
  }
  sessions = (global as any).__hrms_sessions;
}

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  const cookies = cookieHeader ? cookie.parse(cookieHeader) : {};
  const token = cookies.token;

  if (!token) {
    return NextResponse.json({ error: "No authentication token" }, { status: 401 });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;
    const userType = decoded.role === 'employee' ? 'employee' : 'admin';
    const sessionKey = `session_${userType}_${userId}`;
    
    if (typeof global !== 'undefined' && (global as any).__hrms_sessions) {
      sessions = (global as any).__hrms_sessions;
    }
    
    const session = sessions.get(sessionKey);
    
    if (!session) {
      return NextResponse.json({ error: "No active session found" }, { status: 401 });
    }
    
    // Update session activity
    sessions.set(sessionKey, {
      ...session,
      lastActivity: Date.now()
    });
    
    return NextResponse.json({ 
      success: true,
      message: "Session activity updated"
    }, { status: 200 });
    
  } catch (err) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}
