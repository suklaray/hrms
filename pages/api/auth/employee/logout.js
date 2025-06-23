/*import cookie from "cookie";

export default function handler(req, res) {
  res.setHeader("Set-Cookie", cookie.serialize("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/employee/login",
    maxAge: 0,
  }));
  res.status(200).json({ success: true });
}*/
export default function handler(req, res) {
  res.setHeader("Set-Cookie", "token=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict");
  return res.status(200).json({ message: "Logged out" });
}

 

