import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import { getAccessibleRoles } from '@/lib/roleBasedAccess';


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

    // Define role-based filtering using standardized function
    const roleFilter = getAccessibleRoles(decoded.role);

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
          OR: [
            { role: { in: roleFilter }, status: { not: 'Inactive' } },
            { empid: decoded.empid || decoded.id, status: { not: 'Inactive' } }
          ]
        }
      });
    } catch (e) {
      console.error('Error counting users:', e);
    }

    // Get currently online employees (checked in but not checked out today)
    let currentlyOnline = [];
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get all users with role filtering + current user
      const users = await prisma.users.findMany({
        where: {
          OR: [
            { role: { in: roleFilter }, status: { not: 'Inactive' } },
            { empid: decoded.empid || decoded.id, status: { not: 'Inactive' } }
          ]
        },
        select: {
          empid: true,
          name: true,
          role: true,
          position: true,
          profile_photo: true
        }
      });

      // Get today's attendance for these users
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          date: { gte: today, lt: tomorrow },
          empid: { in: users.map(u => u.empid) }
        },
        orderBy: [{ empid: 'asc' }, { check_in: 'asc' }]
      });

      // Find users who are currently logged in (same logic as attendance API)
      const loggedInUsers = [];
      users.forEach(user => {
        const userAttendance = attendanceRecords.filter(a => a.empid === user.empid);
        const currentlyLoggedIn = userAttendance.some(a => a.check_in && !a.check_out);
        
        if (currentlyLoggedIn) {
          const firstCheckIn = userAttendance.find(a => a.check_in)?.check_in;
          loggedInUsers.push({
            empid: user.empid,
            check_in: firstCheckIn,
            users: user
          });
        }
      });
      
      currentlyOnline = loggedInUsers;
      

      
      activeEmployees = currentlyOnline.length;
    } catch (e) {
      console.error('Error fetching currently online employees:', e);
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
      currentlyOnline: currentlyOnline.map(attendance => ({
        empid: attendance.users?.empid,
        name: attendance.users?.name,
        role: attendance.users?.role,
        position: attendance.users?.position,
        profile_photo: attendance.users?.profile_photo,
        check_in: attendance.check_in,
        workingHours: attendance.check_in ? 
          Math.round((new Date() - new Date(attendance.check_in)) / (1000 * 60 * 60) * 10) / 10 : 0
      })),
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