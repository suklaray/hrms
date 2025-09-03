import jwt from "jsonwebtoken";
import cookie from "cookie";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const { token } = cookie.parse(req.headers.cookie || "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: { empid: true }
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: {
        empid: user.empid,
        date: { gte: today }
      },
      orderBy: { date: "desc" }
    });

    const isWorking = !!(attendance?.check_in && !attendance?.check_out);
    const workStartTime = attendance?.check_in || null;

    res.status(200).json({ isWorking, workStartTime });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}