import cookie from "cookie";
import jwt from "jsonwebtoken";
import { destroySession } from "@/lib/authMiddleware";

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract user ID from token to destroy session
  try {
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    const token = cookies.token;
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      destroySession(decoded.id, 'employee');
    }
  } catch (e) {
    // Silent fail - still clear cookie
    console.error('Error destroying session:', e.message);
  }

  let reason = 'manual';
  try {
    if (req.body) {
      const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      reason = bodyData.reason || 'manual';
    }
  } catch (e) {
    // Silent fail
  }

  res.setHeader("Set-Cookie", "token=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict");
  
  return res.status(200).json({ message: "Logged out" });
}