import jwt from "jsonwebtoken";
import { parse } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"; 

export async function verifyEmployeeToken(req) {
  try {
    const cookies = parse(req.headers.cookie || "");
    const token = cookies.token; 
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "employee") return null;

    return decoded;
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}
