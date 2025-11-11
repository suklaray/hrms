import { verifyEmployeeToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await verifyEmployeeToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

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
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    let todayHours = 0;
    if (todayAttendance?.check_in) {
      const checkOut = todayAttendance.check_out || now;
      const diff = checkOut - new Date(todayAttendance.check_in);
      todayHours = Math.max(0, diff / (1000 * 60 * 60));
    }
    // Get all completed sessions for today (where check_out is not null)
    const completedSessions = await prisma.attendance.findMany({
      where: {
        empid: user.empid,
        date: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        },
        check_out: { not: null }
      }
    });
    let todayCompletedSeconds = 0;
    completedSessions.forEach(session => {
      if (session.check_in && session.check_out) {
        const diff = new Date(session.check_out) - new Date(session.check_in);
        todayCompletedSeconds += diff / 1000; // Convert to seconds
      }
    });
    // This week's hours
    const weekAttendance = await prisma.attendance.findMany({
      where: {
        empid: user.empid,
        date: {
          gte: startOfWeek,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    let weekHours = 0;
    weekAttendance.forEach(record => {
      if (record.check_in && record.check_out) {
        const diff = new Date(record.check_out) - new Date(record.check_in);
        weekHours += Math.max(0, diff / (1000 * 60 * 60));
      }
    });

    // This month's hours
    const monthAttendance = await prisma.attendance.findMany({
      where: {
        empid: user.empid,
        date: {
          gte: startOfMonth,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    });

    let monthHours = 0;
    monthAttendance.forEach(record => {
      if (record.check_in && record.check_out) {
        const diff = new Date(record.check_out) - new Date(record.check_in);
        monthHours += Math.max(0, diff / (1000 * 60 * 60));
      }
    });

    res.status(200).json({
      todayHours: todayHours.toFixed(1),
      weekHours: weekHours.toFixed(1),
      monthHours: monthHours.toFixed(1),
      todayCompletedSeconds: todayCompletedSeconds
    });

  } catch (error) {
    console.error('Error fetching employee stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}