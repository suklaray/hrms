import { verifyEmployeeToken } from '@/lib/auth';
import prisma from "@/lib/prisma";
import { format } from 'date-fns';
const isValidCheckout = (dt) => {
  if (!dt) return false;
  const d = new Date(dt);
  return !isNaN(d.getTime()) && d.getFullYear() > 1971;
};

const calculateTotalWorkingHours = (sessions, dateKey) => {
  let closedSeconds = 0;
  let openSeconds = 0;
  const now = new Date();
  const today = new Date().toISOString().split('T')[0];
  const isToday = dateKey === today;

  const validSessions = sessions.filter(s => s.check_in);
  for (const s of validSessions) {
    const checkIn = new Date(s.check_in);
    if (isValidCheckout(s.check_out)) {
      closedSeconds += (new Date(s.check_out) - checkIn) / 1000;
    } else if (isToday) {
      openSeconds += (now - checkIn) / 1000;
    }
  }

  const totalSeconds = closedSeconds + openSeconds;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return {
    totalSeconds,
    closedSeconds,
    formatted: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
  };
};
// ---------------- Attendance / Login Status ----------------
const calculateAttendanceStatus = (total) =>
  total >= 14400 ? "Present" : "Absent";

const getLoginStatus = (sessions) => {
  const hasIn = sessions.some(s => s.check_in);
  const allOut = sessions.every(s => isValidCheckout(s.check_out));
  if (hasIn && allOut) return "Logged Out";
  if (hasIn && !allOut) return "Logged In";
  return "Not Logged In";
};

// ---------------- MAIN API ----------------
export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ message: "Method not allowed" });

  try {
    // Authenticate employee
    const user = await verifyEmployeeToken(req);
    if (!user)
      return res.status(401).json({ message: "Unauthorized access" });

    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Month range
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(targetYear, targetMonth + 1, 1);

    const today = new Date().toISOString().split("T")[0];

    // Fetch attendance for this employee
    const rows = await prisma.attendance.findMany({
      where: {
        empid: user.empid,
        date: { gte: startOfMonth, lt: endOfMonth }
      },
      orderBy: { date: "asc" }
    });

    // Fetch regularization requests for this employee this month
    const regularizations = await prisma.attendance_regularization.findMany({
      where: {
        empid: user.empid,
        attendance_date: { gte: startOfMonth, lt: endOfMonth }
      },
      select: { attendance_id: true, status: true, rejection_reason: true, attendance_date: true }
    });
    const regMap = {};
    const absentRegMap = {};
    regularizations.forEach(r => {
      const key = new Date(r.attendance_date).toISOString().split('T')[0];
      regMap[key] = r;
    });

    // Group by date
    const grouped = rows.reduce((acc, row) => {
      const dateKey = new Date(row.date).toISOString().split("T")[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(row);
      return acc;
    }, {});

    // Populate absentRegMap for regularizations with no matching attendance row
    regularizations.forEach(r => {
      const key = new Date(r.attendance_date).toISOString().split('T')[0];
      if (!grouped[key]) {
        absentRegMap[format(new Date(key), 'dd-MM-yyyy')] = r;
      }
    });

    // Process sessions
    const attendance = Object.entries(grouped).reverse().map(([date, sessions]) => {
      const formattedDate = format(new Date(date), "dd-MM-yyyy");
      const login_status = getLoginStatus(sessions);
      const openSession = sessions.find(s => s.check_in && !isValidCheckout(s.check_out));
      const validIns = sessions.map(s => new Date(s.check_in)).filter(x => !isNaN(x));
      const validOuts = sessions.map(s => s.check_out).filter(isValidCheckout).map(x => new Date(x));

      const firstCheckIn = validIns.length ? new Date(Math.min(...validIns)) : null;
      const lastCheckIn = validIns.length ? new Date(Math.max(...validIns)) : null;
      const CheckOut = validOuts.length ? new Date(Math.max(...validOuts)) : null;

      const { totalSeconds, closedSeconds, formatted } = calculateTotalWorkingHours(sessions, date);
      const completedSeconds = closedSeconds;
      const hasAutoCheckout = sessions.some(
        s => s.attendance_status === "AutoCheckout"
      );

      const attendance_status = sessions.some(
        (s) => s.attendance_status === "AutoCheckout",
      )
        ? calculateAttendanceStatus(totalSeconds) === "Present"
          ? "AutoCheckout"
          : "Absent"
        : calculateAttendanceStatus(totalSeconds);
      const isToday = date === today;

      return {
        date: formattedDate,
        first_check_in: firstCheckIn,
        last_check_in: lastCheckIn,
        check_out: isToday && login_status === 'Logged In' ? '--' : CheckOut,
        total_hours: isToday ? formatted : (totalSeconds === 0 ? '--' : formatted),
        login_status,
        attendance_status,
        currentCheckInTime: openSession?.check_in || null,
        completedSeconds,
        isLoggedIn: isToday && login_status === "Logged In",
        regularization: regMap[date] || null,
      };
    });

    // Summary Calc
    const presentDays = attendance.filter(a => a.attendance_status === "Present" ||
    a.attendance_status === "AutoCheckout").length;

    const profile = await prisma.users.findUnique({
      where: { empid: user.empid },
      select: { name: true, email: true }
    });

    res.status(200).json({
      employee: {
        empid: user.empid,
        name: profile?.name || "--",
        email: profile?.email || "--",
        daysPresent: presentDays,
        daysAbsent: attendance.length - presentDays,
        totalDays: attendance.length
      },
      attendance,
      absentRegMap
    });

  } catch (err) {
    console.error("Attendance Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
