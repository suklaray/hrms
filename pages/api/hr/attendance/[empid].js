import { format } from 'date-fns';
import prisma from "@/lib/prisma";


const formatTime = (date) => {
  const options = { hour: 'numeric', minute: 'numeric', hour12: true };
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

const calculateTotalWorkingHours = (sessions) => {
  let totalSeconds = 0;

  sessions.sort((a, b) => new Date(a.check_in) - new Date(b.check_in));

  for (let i = 0; i < sessions.length; i++) {
    const checkInTime = new Date(sessions[i].check_in);
    const checkOutTime = new Date(sessions[i].check_out);
    const duration = (checkOutTime - checkInTime) / 1000;
    totalSeconds += duration;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return {
    totalSeconds,
    formatted: `${hours} hour(s) ${minutes} minute(s) ${seconds} second(s)`
  };
};

const calculatePresence = (totalSeconds) => {
  return totalSeconds >= 14400 ? 'Present' : 'Absent';
};

export default async function handler(req, res) {
  const { empid } = req.query;

  if (!empid) {
    return res.status(400).json({ error: "empid is required" });
  }

  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // Converted SQL to Prisma (attendance rows)
    const rows = await prisma.attendance.findMany({
      where: {
        empid: empid,
        date: {
          gte: startOfMonth,
          lt: endOfMonth
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    const groupedSessions = rows.reduce((acc, row) => {
      const dateKey = new Date(row.date).toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(row);
      return acc;
    }, {});

    const attendance = Object.entries(groupedSessions).map(([date, sessions]) => {
      const formattedDate = format(new Date(date), 'dd-MM-yyyy');
      const firstCheckIn = new Date(Math.min(...sessions.map(s => new Date(s.check_in))));
      const lastCheckOut = new Date(Math.max(...sessions.map(s => new Date(s.check_out))));
      const { totalSeconds, formatted } = calculateTotalWorkingHours(sessions);
      const status = calculatePresence(totalSeconds);

      return {
        date: formattedDate,
        check_in: formatTime(firstCheckIn),
        check_out: formatTime(lastCheckOut),
        total_hours: formatted,
        status
      };
    });

    const presentDays = attendance.filter(row => row.status === 'Present').length;
    const totalDays = attendance.length;
    const absentDays = totalDays - presentDays;

    // Converted SQL to Prisma (user info)
    const user = await prisma.users.findUnique({
      where: {
        empid: empid
      },
      select: {
        name: true,
        email: true
      }
    });

    const employee = {
      name: user?.name || 'N/A',
      email: user?.email || 'N/A',
      empid: empid,
      daysPresent: presentDays,
      daysAbsent: absentDays
    };

    res.status(200).json({
      employee,
      attendance
    });

  } catch (error) {
    console.error('Attendance Error:', error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
