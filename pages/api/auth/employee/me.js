import jwt from "jsonwebtoken";
import cookie from "cookie";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    // 1. Read token from cookies
    const { token } = cookie.parse(req.headers.cookie || "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "employee") {
      return res.status(403).json({ error: "Access denied" });
    }

    // 3. Fetch basic employee details from `users` table
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

    // Check if employee has checked in today but not checked out
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: {
        empid: user.empid,
        date: {
          gte: today,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    const isWorking = !!(attendance?.check_in && !attendance?.check_out);

    // 5. Return user info + attendance status
    res.status(200).json({
      user: {
        ...user,
        isWorking,
      },
    });
  } catch (err) {
    console.error("Auth error in /me:", err);
    res.status(401).json({ error: "Invalid token" });
  }
}
