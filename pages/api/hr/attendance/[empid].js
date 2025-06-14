import db from '@/lib/db'; 
import { format } from 'date-fns';

const formatTime = (date) => {
  return format(date, 'h:mm a');
};

const calculateTotalWorkingHours = (sessions) => {
  let totalSeconds = 0;

  sessions.sort((a, b) => new Date(a.check_in) - new Date(b.check_in));

  for (let i = 0; i < sessions.length; i++) {
    const start = new Date(sessions[i].check_in);
    const end = new Date(sessions[i].check_out);
    const duration = (end - start) / 1000; // in seconds
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

// Helper to determine presence
const calculatePresence = (totalSeconds) => {
  return totalSeconds >= 14400 ? 'Present' : 'Absent'; // 4 hours = 14400 seconds
};

export default async function handler(req, res) {
  const { empid } = req.query;

  if (!empid) {
    return res.status(400).json({ error: "empid is required" });
  }

  try {
    // Fetch this month's attendance sessions for the employee
    const [rows] = await db.query(
      `SELECT date, check_in, check_out 
       FROM attendance 
       WHERE empid = ? 
       AND MONTH(date) = MONTH(CURDATE()) 
       AND YEAR(date) = YEAR(CURDATE()) 
       ORDER BY date ASC`,
      [empid]
    );

    // Group by date
    const groupedSessions = rows.reduce((acc, row) => {
      const dateKey = format(new Date(row.date), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(row);
      return acc;
    }, {});

    // Build attendance records
    const attendance = Object.entries(groupedSessions).map(([date, sessions]) => {
      const formattedDate = format(new Date(date), 'dd-MM-yyyy');
      const checkIn = new Date(Math.min(...sessions.map(s => new Date(s.check_in))));
      const checkOut = new Date(Math.max(...sessions.map(s => new Date(s.check_out))));

      const { totalSeconds, formatted } = calculateTotalWorkingHours(sessions);
      const status = calculatePresence(totalSeconds);

      return {
        date: formattedDate,
        check_in: formatTime(checkIn),
        check_out: formatTime(checkOut),
        total_hours: formatted,
        status
      };
    });

    // Count present days
    const presentDays = attendance.filter(row => row.status === 'Present').length;

    // Total days considered = distinct dates from attendance, not full month days
    const totalDays = attendance.length;
    const absentDays = totalDays - presentDays;

    // Get employee info
    const [employeeRows] = await db.query(
      `SELECT name, email FROM users WHERE empid = ?`,
      [empid]
    );

    const employee = {
      name: employeeRows[0]?.name || 'N/A',
      email: employeeRows[0]?.email || 'N/A',
      empid,
      daysPresent: presentDays,
      daysAbsent: absentDays
    };

    res.status(200).json({
      employee,
      attendance
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
