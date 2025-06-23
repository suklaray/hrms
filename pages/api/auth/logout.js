// pages/api/auth/logout.js
import cookie from "cookie";

export default function handler(req, res) {
  res.setHeader("Set-Cookie", cookie.serialize("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: new Date(0),
    path: "/",
  }));

  res.status(200).json({ message: "Logout successful" });
}
