// lib/auth-hr.js
import jwt from "jsonwebtoken";
import { parse } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function verifyHRToken(req) {
  try {
    const cookies = parse(req.headers.cookie || "");
    const token = cookies.token;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);

    if (["hr", "admin", "superadmin"].includes(decoded.role)) {
      return decoded;
    }

    return null;
  } catch (err) {
    console.error("HR JWT verification failed:", err);
    return null;
  }
}
