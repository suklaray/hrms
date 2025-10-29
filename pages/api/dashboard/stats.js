// Update the dashboard stats API
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

    // Define role-based filtering
    let roleFilter = [];
    if (decoded.role === 'hr') {
      roleFilter = ['employee','hr'];
    } else if (decoded.role === 'admin') {
      roleFilter = ['hr', 'employee', 'admin'];
    } else if (decoded.role === 'superadmin') {
      roleFilter = ['admin', 'hr', 'employee'];
    }

    // Get basic counts with error handling
    let totalEmployees = 0;
    let activeEmployees = 0;
    let pendingLeaves = 0;
    let todayAttendance = 0;
    let totalCandidates = 0;
    let recentEmployees = [];

    try {
      totalEmployees = await prisma.users.count({
        where: {
          role: { in: roleFilter },
          status: { not: 'Inactive' }
        }
      });
    } catch (e) {
      console.error('Error counting users:', e);
    }

    // Get currently online employees - same logic as HR attendance page
    try {
      const results = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count
        FROM users u
        WHERE u.role IN (${roleFilter.map(role => `'${role}'`).join(', ')})
          AND u.status != 'Inactive'
          AND EXISTS (
            SELECT 1 FROM attendance a2 
            WHERE a2.empid = u.empid 
              AND DATE(a2.check_in) = CURRENT_DATE 
              AND a2.check_out IS NULL
          )
      `);
      
      activeEmployees = parseInt(results[0]?.count || 0);
    } catch (e) {
      console.error('Error counting currently online employees:', e);
      activeEmployees = 0;
    }

    try {
      pendingLeaves = await prisma.leave_requests.count({ 
        where: { 
          status: 'Pending',
          users: {
            role: { in: roleFilter },
            status: { not: 'Inactive' }
          }
        } 
      });
    } catch (e) {
      console.error('Error counting leave requests:', e);
    }

    try {
      todayAttendance = await prisma.attendance.count({ 
        where: { 
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          },
          attendance_status: 'Present'
        } 
      });
    } catch (e) {
      console.error('Error counting attendance:', e);
    }

    try {
      totalCandidates = await prisma.candidates.count();
    } catch (e) {
      console.error('Error counting candidates:', e);
    }

    try {
      recentEmployees = await prisma.users.findMany({
        where: {
          role: { in: roleFilter },
          status: { not: 'Inactive' }
        },
        orderBy: { id: 'desc' },
        take: 5,
        select: {
          empid: true,
          name: true,
          role: true,
          position: true,
          employee_type: true,
          date_of_joining: true,
          profile_photo: true
        }
      });
    } catch (e) {
      console.error('Error fetching recent employees:', e);
      recentEmployees = [];
    }

    const attendancePercentage = activeEmployees > 0 
      ? Math.round((todayAttendance / activeEmployees) * 100) 
      : 0;

    res.status(200).json({
      totalEmployees,
      activeEmployees,
      pendingLeaves,
      todayAttendance: attendancePercentage,
      totalCandidates,
      recentEmployees: recentEmployees.map(emp => ({
        empid: emp.empid,
        name: emp.name,
        role: emp.role,
        position: emp.position,
        type: emp.employee_type,
        createdAt: emp.date_of_joining || new Date(),
        profile_photo: emp.profile_photo
      }))
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
