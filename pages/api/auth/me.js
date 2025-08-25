import jwt from "jsonwebtoken";
import cookie from "cookie";

export default function handler(req, res) {
  let token = null;

  // Safely parse cookies
  if (req.headers.cookie) {
    const parsed = cookie.parse(req.headers.cookie);
    token = parsed.token;
  }

  if (!token) {
    return res.status(200).json({ user: null, authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ user: decoded, authenticated: true });
  } catch (err) {
    return res.status(200).json({ user: null, authenticated: false });
  }
}
