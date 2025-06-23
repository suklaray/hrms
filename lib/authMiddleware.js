// lib/authMiddleware.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

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
