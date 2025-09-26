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
        empid: true,
        name: true,
        email: true,
        profile_photo: true, // Get profile photo from users table
        role: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // For admin/hr users, use profile_photo from users table
    // For regular employees, try to get from employees table as fallback
    let profilePic = user.profile_photo;
    
    if (!profilePic && (user.role === 'employee')) {
      const employee = await prisma.employees.findFirst({
        where: { email: user.email },
        select: { profile_photo: true }
      });
      profilePic = employee?.profile_photo;
    }

    res.status(200).json({
      empid: user.empid,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: profilePic || null,
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
