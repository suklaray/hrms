import { format } from 'date-fns';
import prisma from "@/lib/prisma";

const isValidCheckout = (dt) => {
  if (!dt) return false;
  const d = new Date(dt);
  return !isNaN(d.getTime()) && d.getFullYear() > 1971;
};

const calculateTotalWorkingHours = (sessions, dateKey) => {
  let totalSeconds = 0;
  const now = new Date();
  const today = new Date().toISOString().split('T')[0];
  const isToday = dateKey === today;

  const validSessions = sessions.filter(s => s.check_in);
  validSessions.sort((a, b) => new Date(a.check_in) - new Date(b.check_in));

  for (let i = 0; i < validSessions.length; i++) {
    const checkInTime = new Date(validSessions[i].check_in);
    if (isValidCheckout(validSessions[i].check_out)) {
      const checkOutTime = new Date(validSessions[i].check_out);
      totalSeconds += (checkOutTime - checkInTime) / 1000;
    } else if (isToday) {
      totalSeconds += (now - checkInTime) / 1000;
    }
    // Past days with no valid checkout: skip
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return {
    totalSeconds,
    formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
  };
};

const calculateAttendanceStatus = (total) =>
  total >= 14400 ? "Present" : "Absent";

const getLoginStatus = (sessions) => {
  const hasCheckIn = sessions.some(s => s.check_in);
  const hasValidCheckOut = sessions.every(s => isValidCheckout(s.check_out));

  if (hasCheckIn && hasValidCheckOut) return 'Logged Out';
  if (hasCheckIn && !hasValidCheckOut) return 'Logged In';
  return 'Not Logged In';
};

export default async function handler(req, res) {
  const { empid, month, year } = req.query;

  if (!empid) {
    return res.status(400).json({ error: "empid is required" });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const selectedMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const selectedYear  = year  ? parseInt(year)      : new Date().getFullYear();

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth   = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);

    const rows = await prisma.attendance.findMany({
      where: {
        empid,
        date: { gte: startOfMonth, lt: endOfMonth },
      },
      orderBy: { date: 'asc' },
    });

    // Fetch regularization requests for this employee this month
    const regularizations = await prisma.attendance_regularization.findMany({
      where: {
        empid,
        attendance_date: { gte: startOfMonth, lt: endOfMonth }
      },
      select: { id: true, attendance_date: true, check_in_time: true, requested_checkout: true, reason: true, status: true, rejection_reason: true, created_at: true }
    });
    const regMap = {};
    const absentRegMap = {};
    regularizations.forEach(r => {
      const key = new Date(r.attendance_date).toISOString().split('T')[0];
      regMap[key] = r;
    });

    const groupedSessions = rows.reduce((acc, row) => {
      const dateKey = new Date(row.date).toISOString().split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(row);
      return acc;
    }, {});

    // Populate absentRegMap for regularizations with no matching attendance row
    regularizations.forEach(r => {
      const key = new Date(r.attendance_date).toISOString().split('T')[0];
      if (!groupedSessions[key]) {
        absentRegMap[format(new Date(key), 'dd-MM-yyyy')] = r;
      }
    });

    const attendance = Object.entries(groupedSessions).map(([date, sessions]) => {
      const formattedDate = format(new Date(date), 'dd-MM-yyyy');
      const login_status = getLoginStatus(sessions);

      const validCheckIns = sessions.map(s => new Date(s.check_in)).filter(d => !isNaN(d));
      const validCheckOuts = sessions.map(s => new Date(s.check_out)).filter(d => !isNaN(d) && d.getFullYear() > 1971);

      const firstCheckIn = validCheckIns.length ? new Date(Math.min(...validCheckIns)) : null;
      const lastCheckIn = validCheckIns.length ? new Date(Math.max(...validCheckIns)) : null;
      const lastCheckOut = validCheckOuts.length ? new Date(Math.max(...validCheckOuts)) : null;

      const { totalSeconds, formatted } = calculateTotalWorkingHours(sessions, date);

      const attendance_status = sessions.some(s => s.attendance_status === "AutoCheckout")
        ? calculateAttendanceStatus(totalSeconds) === "Present" ? "AutoCheckout" : "Absent"
        : calculateAttendanceStatus(totalSeconds);

      const isToday = date === today;
      const check_out_display = isToday && login_status === 'Logged In' ? '--' : lastCheckOut;
      // Show '--' for past days with no valid checkout instead of 00:00:00
      const total_hours_display = totalSeconds === 0 && !isToday ? '--' : formatted;

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

    const presentDays = attendance.filter(row =>
      row.attendance_status === 'Present' || row.attendance_status === "AutoCheckout"
    ).length;
    const totalDays = attendance.length;
    const absentDays = totalDays - presentDays;

    const user = await prisma.users.findUnique({
      where: { empid },
      select: { name: true, email: true },
    });

    const employee = {
      name: user?.name || '--',
      email: user?.email || '--',
      empid,
      daysPresent: presentDays,
      daysAbsent: absentDays,
      totalDays,
    };

    res.status(200).json({ employee, attendance, absentRegMap });

  } catch (error) {
    console.error('Attendance Error:', error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
