// pages/api/auth/reset-password.js
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long" });
  }

  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.token;

  if (!token) return res.status(401).json({ error: "Unauthorized" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.users.update({
    where: { email: decoded.email },
    data: { password: hashedPassword },
  });

  return res.status(200).json({ message: "Password updated successfully" });
}
