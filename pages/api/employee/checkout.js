import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // Verify JWT token
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Allow all authenticated users to check out

    // Use empid from JWT token, not request body
    const empid = decoded.empid;

    // Proceed with checkout
    const checkoutTime = new Date();
    
    // Find the latest check-in record without checkout
    const latestCheckin = await prisma.attendance.findFirst({
      where: {
        empid,
        check_out: null,
      },
      orderBy: {
        check_in: 'desc'
      }
    });

    if (latestCheckin) {
      // Calculate total hours
      const totalHours = (checkoutTime - new Date(latestCheckin.check_in)) / (1000 * 60 * 60);
      const attendanceStatus = totalHours >= 4 ? "Present" : "Absent";
      
      await prisma.$transaction([
        prisma.users.update({
          where: { empid },
          data: { status: "Logged Out" },
        }),
        prisma.attendance.update({
          where: { id: latestCheckin.id },
          data: {
            check_out: checkoutTime,
            total_hours: totalHours,
            attendance_status: attendanceStatus
          },
        }),
      ]);
    } else {
      return res.status(400).json({ error: "No active check-in found" });
    }

    res.status(200).json({ message: "Check-out successful" });
  } catch (err) {
    res.status(500).json({ error: "Check-out failed", details: err.message });
  }
}
