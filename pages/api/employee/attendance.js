import { verifyEmployeeToken } from '@/lib/auth';
import prisma from "@/lib/prisma";
import { format } from 'date-fns';

// ---------------- Format Time ----------------
const formatTime = (date) => {
  if (!date || isNaN(new Date(date))) return '';
  const opts = { hour: 'numeric', minute: 'numeric', hour12: true };
  return new Intl.DateTimeFormat('en-US', opts).format(new Date(date));
};

// ---------------- Total Working Hours ----------------
const calculateTotalWorkingHours = (sessions) => {
  let totalSeconds = 0;

  const validSessions = sessions.filter(s => s.check_in && s.check_out);
  
  for (let s of validSessions) {
    const checkIn = new Date(s.check_in);
    const checkOut = new Date(s.check_out);
    totalSeconds += (checkOut - checkIn) / 1000;
  }

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s2 = Math.floor(totalSeconds % 60);

  return {
    totalSeconds,
    formatted: `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s2.toString().padStart(2, '0')}`
  };
};

// ---------------- Attendance / Login Status ----------------
const calculateAttendanceStatus = (total) =>
  total >= 14400 ? "Present" : "Absent";

const getLoginStatus = (sessions) => {
  const hasIn = sessions.some(s => s.check_in);
  const allOut = sessions.every(s => s.check_out);

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

    // Group by date
    const grouped = rows.reduce((acc, row) => {
      const dateKey = new Date(row.date).toISOString().split("T")[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(row);
      return acc;
    }, {});

    // Process sessions
    const attendance = Object.entries(grouped).reverse().map(([date, sessions]) => {
      const formattedDate = format(new Date(date), "dd-MM-yyyy");
      const login_status = getLoginStatus(sessions);

      const validIns = sessions.map(s => new Date(s.check_in)).filter(x => !isNaN(x));
      const validOuts = sessions.map(s => new Date(s.check_out)).filter(x => !isNaN(x));

      const firstCheckIn = validIns.length ? new Date(Math.min(...validIns)) : null;
      const lastCheckIn = validIns.length ? new Date(Math.max(...validIns)) : null;
      const CheckOut = validOuts.length ? new Date(Math.max(...validOuts)) : null;

      const { totalSeconds, formatted } = calculateTotalWorkingHours(sessions);
      const attendance_status = calculateAttendanceStatus(totalSeconds);

      const isToday = date === today;

      return {
        date: formattedDate,
        first_check_in: formatTime(firstCheckIn),
        last_check_in: formatTime(lastCheckIn),
        check_out: isToday && login_status === 'Logged In' ? '--' : formatTime(CheckOut),
        total_hours: formatted,
        login_status,
        attendance_status,
      };
    });

    // Summary Calc
    const presentDays = attendance.filter(a => a.attendance_status === "Present").length;

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
      attendance
    });

  } catch (err) {
    console.error("Attendance Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
