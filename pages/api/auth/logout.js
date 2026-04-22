import cookie from "cookie";

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

  res.setHeader("Set-Cookie", cookie.serialize("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
    path: "/",
  }));

  res.status(200).json({ message: "Logout successful" });
}