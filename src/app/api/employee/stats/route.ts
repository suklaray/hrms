import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const canView = await checkPermission(user, PERMISSION_KEYS.ATTENDANCE_MY);
  if (!canView) {
    return NextResponse.json({ message: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's hours
    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        empid: user.empid,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    let todayHours = 0;
    if (todayAttendance?.check_in) {
      const checkOut = todayAttendance.check_out || now;
      const diff = new Date(checkOut).getTime() - new Date(todayAttendance.check_in).getTime();
      todayHours = Math.max(0, diff / (1000 * 60 * 60));
    }

    // Get all completed sessions for today (where check_out is not null)
    const completedSessions = await prisma.attendance.findMany({
      where: {
        empid: user.empid,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
        check_out: { not: null },
      },
    });

    let todayCompletedSeconds = 0;
    completedSessions.forEach((session) => {
      if (session.check_in && session.check_out) {
        const diff = new Date(session.check_out).getTime() - new Date(session.check_in).getTime();
        todayCompletedSeconds += diff / 1000; // Convert to seconds
      }
    });

    // This week's hours
    const weekAttendance = await prisma.attendance.findMany({
      where: {
        empid: user.empid,
        date: {
          gte: startOfWeek,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    let weekHours = 0;
    weekAttendance.forEach((record) => {
      if (record.check_in && record.check_out) {
        const diff = new Date(record.check_out).getTime() - new Date(record.check_in).getTime();
        weekHours += Math.max(0, diff / (1000 * 60 * 60));
      }
    });

    // This month's hours
    const monthAttendance = await prisma.attendance.findMany({
      where: {
        empid: user.empid,
        date: {
          gte: startOfMonth,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    let monthHours = 0;
    monthAttendance.forEach((record) => {
      if (record.check_in && record.check_out) {
        const diff = new Date(record.check_out).getTime() - new Date(record.check_in).getTime();
        monthHours += Math.max(0, diff / (1000 * 60 * 60));
      }
    });

    return NextResponse.json(
      {
        todayHours: todayHours.toFixed(1),
        weekHours: weekHours.toFixed(1),
        monthHours: monthHours.toFixed(1),
        todayCompletedSeconds: todayCompletedSeconds,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching employee stats:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}