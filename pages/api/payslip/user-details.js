import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { empid } = req.query;
    
    // Use empid from URL parameter
    const user = await prisma.users.findUnique({
      where: { empid: empid },
      select: { empid: true, name: true, email: true, role: true, contact_number: true, position: true }
    });
    
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
}
