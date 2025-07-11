import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }

  const user = await prisma.users.findUnique({
    where: { email: decoded.email },
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
}
