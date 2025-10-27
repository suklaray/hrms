import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

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
    if (!decoded || !['admin', 'hr', 'superadmin'].includes(decoded.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get user info
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid },
      select: {
        empid: true,
        name: true,
        email: true,
        role: true,
        position: true,
      },
    });

    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        empid: decoded.empid,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        date: true,
        check_in: true,
        check_out: true,
        total_hours: true,
        attendance_status: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.status(200).json({
      user,
      attendance: attendanceRecords
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
