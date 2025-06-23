import jwt from "jsonwebtoken";
import cookie from "cookie";

export default function handler(req, res) {
  const { token } = cookie.parse(req.headers.cookie || "");

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ user });
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
