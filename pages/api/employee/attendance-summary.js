import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from "@/lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const user = await verifyEmployeeToken(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { month, year } = req.query;

    // Get target month start and end dates
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

    // Fetch attendance records for current month
    const attendance = await prisma.attendance.findMany({
      where: {
        empid: user.empid,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        date: true,
        check_in: true,
        check_out: true,
        attendance_status: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.status(200).json(attendance);
  } catch (error) {
    console.error("Error fetching attendance summary:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}