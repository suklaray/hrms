import jwt from "jsonwebtoken";
import cookie from "cookie";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    const { token } = cookie.parse(req.headers.cookie || "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "employee") {
      return res.status(403).json({ error: "Access denied" });
    }

    const user = await prisma.users.findUnique({
      where: { id: decoded.id },
      select: {
        empid: true,
        name: true,
        email: true,
        role: true,
        position: true,
        profile_photo: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
}
