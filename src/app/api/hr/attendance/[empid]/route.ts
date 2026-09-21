import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import cookie from "cookie";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

const isValidCheckout = (dt: any) => {
  if (!dt) return false;
  const d = new Date(dt);
  return !isNaN(d.getTime()) && d.getFullYear() > 1971;
};

const calculateTotalWorkingHours = (sessions: any, dateKey: string) => {
  let totalSeconds = 0;
  const now = new Date();
  const today = new Date().toISOString().split("T")[0];
  const isToday = dateKey === today;

  const validSessions = (sessions as any[]).filter((s) => s.check_in);
  validSessions.sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime());

  for (let i = 0; i < validSessions.length; i++) {
    const checkInTime = new Date(validSessions[i].check_in);
    if (isValidCheckout(validSessions[i].check_out)) {
      const checkOutTime = new Date(validSessions[i].check_out);
      totalSeconds += (checkOutTime.getTime() - checkInTime.getTime()) / 1000;
    } else if (isToday) {
      totalSeconds += (now.getTime() - checkInTime.getTime()) / 1000;
    }
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return {
    totalSeconds,
    formatted: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
  };
};

const calculateAttendanceStatus = (total: number) =>
  total >= 14400 ? "Present" : "Absent";

const getLoginStatus = (sessions: any[]) => {
  const hasCheckIn = sessions.some((s) => s.check_in);
  const hasValidCheckOut = sessions.every((s) => isValidCheckout(s.check_out));

  if (hasCheckIn && hasValidCheckOut) return "Logged Out";
  if (hasCheckIn && !hasValidCheckOut) return "Logged In";
  return "Not Logged In";
};

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const params = await context?.params;
  const empid = params?.empid;
  const searchParams = req.nextUrl.searchParams;
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const cookies = cookie.parse(req.headers.get("cookie") || "");
  const token = cookies.token || req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.ATTENDANCE_VIEW);
  if (!hasAccess) {
    return NextResponse.json({ message: "Unauthorized: insufficient permissions" }, { status: 403 });
  }

  if (!empid) {
    return NextResponse.json({ error: "empid is required" }, { status: 400 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    const selectedMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

    const rows = await prisma.attendance.findMany({
      where: {
        empid,
        date: { gte: startOfMonth, lt: endOfMonth },
      },
      orderBy: { date: "asc" },
    });

    // Fetch regularization requests for this employee this month
    const regularizations = await prisma.attendance_regularization.findMany({
      where: {
        empid,
        attendance_date: { gte: startOfMonth, lt: endOfMonth },
      },
      select: {
        id: true,
        attendance_date: true,
        check_in_time: true,
        requested_checkout: true,
        reason: true,
        status: true,
        rejection_reason: true,
        created_at: true,
      },
    });

    const regMap: Record<string, any> = {};
    const absentRegMap: Record<string, any> = {};
    regularizations.forEach((r) => {
      const key = new Date(r.attendance_date).toISOString().split("T")[0];
      regMap[key] = {
        ...r,
        check_in_time: r.check_in_time ? format(r.check_in_time, "HH:mm") : null,
        requested_checkout: r.requested_checkout ? format(r.requested_checkout, "HH:mm") : null,
      };
    });

    const groupedSessions = rows.reduce((acc: any, row) => {
      const dateKey = new Date(row.date).toISOString().split("T")[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(row);
      return acc;
    }, {});

    // Populate absentRegMap for regularizations with no matching attendance row
    regularizations.forEach((r) => {
      const key = new Date(r.attendance_date).toISOString().split("T")[0];
      if (!groupedSessions[key]) {
        absentRegMap[format(new Date(key), "dd-MM-yyyy")] = {
          ...r,
          check_in_time: r.check_in_time ? format(r.check_in_time, "HH:mm") : null,
          requested_checkout: r.requested_checkout ? format(r.requested_checkout, "HH:mm") : null,
        };
      }
    });

    const attendance = Object.entries(groupedSessions).map(([date, sessions]) => {
      const formattedDate = format(new Date(date), "dd-MM-yyyy");
      const login_status = getLoginStatus(sessions as any[]);

      const validCheckIns = (sessions as any[])
        .map((s: any) => new Date(s.check_in))
        .filter((d: Date) => !isNaN(d.getTime()));
      const validCheckOuts = (sessions as any[])
        .map((s: any) => new Date(s.check_out))
        .filter((d: Date) => !isNaN(d.getTime()) && d.getFullYear() > 1971);

      const firstCheckIn = validCheckIns.length
        ? new Date(Math.min(...validCheckIns.map((d: Date) => d.getTime())))
        : null;
      const lastCheckIn = validCheckIns.length
        ? new Date(Math.max(...validCheckIns.map((d: Date) => d.getTime())))
        : null;
      const lastCheckOut = validCheckOuts.length
        ? new Date(Math.max(...validCheckOuts.map((d: Date) => d.getTime())))
        : null;

      const { totalSeconds, formatted } = calculateTotalWorkingHours(sessions, date);

      const attendance_status = (sessions as any[]).some((s) => s.attendance_status === "AutoCheckout")
        ? calculateAttendanceStatus(totalSeconds) === "Present"
          ? "AutoCheckout"
          : "Absent"
        : calculateAttendanceStatus(totalSeconds);

      const isToday = date === today;
      const check_out_display = isToday && login_status === "Logged In" ? "--" : lastCheckOut;
      const total_hours_display = totalSeconds === 0 && !isToday ? "--" : formatted;

      return {
        date: formattedDate,
        check_in: firstCheckIn,
        last_check_in: lastCheckIn,
        check_out: check_out_display,
        total_hours: total_hours_display,
        login_status,
        attendance_status,
        regularization: regMap[date] || null,
      };
    });

    const presentDays = attendance.filter(
      (row) => row.attendance_status === "Present" || row.attendance_status === "AutoCheckout"
    ).length;
    const totalDays = attendance.length;
    const absentDays = totalDays - presentDays;

    const user = await prisma.users.findUnique({
      where: { empid },
      select: { name: true, email: true },
    });

    const employee = {
      name: user?.name || "--",
      email: user?.email || "--",
      empid,
      daysPresent: presentDays,
      daysAbsent: absentDays,
      totalDays,
    };

    return NextResponse.json({ employee, attendance, absentRegMap }, { status: 200 });
  } catch (error) {
    console.error("Attendance Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
