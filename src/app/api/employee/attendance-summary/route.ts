import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from "@/lib/auth";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  

  try {
    const user = await verifyEmployeeToken(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { month, year } = query;

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

    return NextResponse.json(attendance, { status: 200 });
  } catch (error) {
    console.error("Error fetching attendance summary:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

