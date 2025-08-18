import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!['admin', 'hr', 'superadmin'].includes(decoded.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [totalEmployees, activeEmployees, pendingLeaves, todayAttendance] = await Promise.all([
      prisma.users.count(),
      prisma.users.count({ where: { status: 'Active' } }),
      prisma.leave_requests.count({ where: { status: 'Pending' } }),
      prisma.attendance.count({ 
        where: { 
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          },
          attendance_status: 'Present'
        } 
      })
    ]);

    const totalEmployeesForAttendance = await prisma.users.count({ where: { status: 'Active' } });
    const attendancePercentage = totalEmployeesForAttendance > 0 
      ? Math.round((todayAttendance / totalEmployeesForAttendance) * 100) 
      : 0;

    res.status(200).json({
      totalEmployees,
      activeEmployees,
      pendingLeaves,
      todayAttendance: attendancePercentage
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}