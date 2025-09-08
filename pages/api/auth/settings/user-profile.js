import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
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

  try {
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid },
      select: {
        name: true,
        email: true,
        profile_photo: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({
      name: user.name,
      email: user.email,
      profilePic: user.profile_photo || null,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
