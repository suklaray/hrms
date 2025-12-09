import { format } from 'date-fns';
import prisma from "@/lib/prisma";

const formatTime = (date) => {
  if (!date || isNaN(new Date(date))) return '';
  const options = { hour: 'numeric', minute: 'numeric', hour12: true };
  return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
};

const calculateTotalWorkingHours = (sessions) => {
  let totalSeconds = 0;
  const now = new Date();

  const validSessions = sessions.filter(s => s.check_in);
  validSessions.sort((a, b) => new Date(a.check_in) - new Date(b.check_in));

  for (let i = 0; i < validSessions.length; i++) {
    const checkInTime = new Date(validSessions[i].check_in);
    const checkOutTime = validSessions[i].check_out ? new Date(validSessions[i].check_out) : now;
    const duration = (checkOutTime - checkInTime) / 1000;
    totalSeconds += duration;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return {
    totalSeconds,
    formatted: `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
  };
};

const calculateAttendanceStatus = (totalSeconds) => {
  return totalSeconds >= 14400 ? 'Present' : 'Absent'; // >= 4 hours
};

const getLoginStatus = (sessions) => {
  const hasCheckIn = sessions.some(s => s.check_in);
  const hasCheckOut = sessions.every(s => s.check_out);

  if (hasCheckIn && hasCheckOut) return 'Logged Out';
  if (hasCheckIn && !hasCheckOut) return 'Logged In';
  return 'Not Logged In';
};

export default async function handler(req, res) {
  const { empid } = req.query;

  if (!empid) {
    return res.status(400).json({ error: "empid is required" });
  }

  try {
    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const rows = await prisma.attendance.findMany({
      where: {
        empid,
        date: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const groupedSessions = rows.reduce((acc, row) => {
      const dateKey = new Date(row.date).toISOString().split('T')[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(row);
      return acc;
    }, {});

    const attendance = Object.entries(groupedSessions).map(([date, sessions]) => {
      const formattedDate = format(new Date(date), 'dd-MM-yyyy');
      const login_status = getLoginStatus(sessions);

      const validCheckIns = sessions.map(s => new Date(s.check_in)).filter(d => !isNaN(d));
      const validCheckOuts = sessions.map(s => new Date(s.check_out)).filter(d => !isNaN(d));

      const firstCheckIn = validCheckIns.length ? new Date(Math.min(...validCheckIns)) : null;
      const lastCheckIn = validCheckIns.length ? new Date(Math.max(...validCheckIns)) : null;
      const lastCheckOut = validCheckOuts.length ? new Date(Math.max(...validCheckOuts)) : null;

      const { totalSeconds, formatted } = calculateTotalWorkingHours(sessions);
      const attendance_status = calculateAttendanceStatus(totalSeconds);

      //  Today’s logout logic
      const isToday = date === today;
      const check_out_display = isToday && login_status === 'Logged In'
        ? '--'
        : formatTime(lastCheckOut);

      return {
        date: formattedDate,
        check_in: formatTime(firstCheckIn),
        last_check_in: formatTime(lastCheckIn),
        check_out: check_out_display,
        total_hours: formatted,
        login_status,
        attendance_status,
      };
    });

    const presentDays = attendance.filter(row => row.attendance_status === 'Present').length;
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

    res.status(200).json({ employee, attendance });

  } catch (error) {
    console.error('Attendance Error:', error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
