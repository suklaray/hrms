import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
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

const calculateAttendanceStatus = (total) => total >= 14400 ? "Present" : "Absent";

const getLoginStatus = (sessions) => {
  const hasIn = sessions.some(s => s.check_in);
  const allOut = sessions.every(s => isValidCheckout(s.check_out));
  if (hasIn && allOut) return "Logged Out";
  if (hasIn && !allOut) return "Logged In";
  return "Not Logged In";
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid },
      select: { empid: true, name: true, email: true, role: true, position: true },
    });

    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 1);
    const today = new Date().toISOString().split("T")[0];

    const rows = await prisma.attendance.findMany({
      where: {
        empid: decoded.empid,
        date: { gte: startOfMonth, lt: endOfMonth }
      },
      orderBy: { date: "asc" }
    });

    const regs = await prisma.attendance_regularization.findMany({
      where: { empid: decoded.empid, attendance_date: { gte: startOfMonth, lt: endOfMonth } },
      select: { attendance_date: true, status: true, reason: true, rejection_reason: true }
    });
    const regMap = {};
    for (const r of regs) regMap[new Date(r.attendance_date).toISOString().split('T')[0]] = r;

    const grouped = rows.reduce((acc, row) => {
      const dateKey = new Date(row.date).toISOString().split("T")[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(row);
      return acc;
    }, {});

    // Also fetch regs for absent days (no attendance row)
    const absentRegs = regs.filter(r => {
      const dateKey = new Date(r.attendance_date).toISOString().split('T')[0];
      return !grouped[dateKey];
    });
    // Merge absent-day regs into regMap (already done above), nothing extra needed
    // The frontend synthetic absent records will pick up regMap via date string match
    // But we need to send absent-day regularizations so frontend can match by date
    const absentRegMap = {};
    for (const r of absentRegs) {
      const dateKey = new Date(r.attendance_date).toISOString().split('T')[0];
      absentRegMap[format(new Date(dateKey), 'dd-MM-yyyy')] = r;
    }

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

    res.status(200).json({ user, attendance, absentRegMap });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
