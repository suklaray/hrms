// Update the dashboard stats API
import prisma from '@/lib/prisma';
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

    // Define role-based filtering
    const roleFilter = getAccessibleRoles(decoded.role);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Initialize default values
    let totalEmployees = 0;
    let activeEmployees = 0;
    let pendingLeaves = 0;
    let todayAttendance = 0;
    let totalCandidates = 0;
    let recentEmployees = [];
    let currentlyOnline = [];

    try {
      // Single optimized query using Promise.allSettled to prevent one failure from breaking others
      const results = await Promise.allSettled([
        // Query 1: Get users with attendance data
        prisma.users.findMany({
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
            employee_type: true,
            date_of_joining: true,
            profile_photo: true,
            id: true
          },
          orderBy: { id: 'desc' }
        }),
        
        // Query 2: Get today's attendance
        prisma.attendance.findMany({
          where: {
            date: { gte: today, lt: tomorrow }
          },
          select: {
            empid: true,
            check_in: true,
            check_out: true,
            attendance_status: true
          },
          orderBy: [{ empid: 'asc' }, { check_in: 'asc' }]
        }),
        
        // Query 3: Count pending leaves
        prisma.leave_requests.count({
          where: {
            status: 'Pending',
            users: {
              role: { in: roleFilter },
              status: { not: 'Inactive' }
            }
          }
        }),
        
        // Query 4: Count candidates
        prisma.candidates.count()
      ]);

      // Process results safely
      const [usersResult, attendanceResult, leavesResult, candidatesResult] = results;
      
      if (usersResult.status === 'fulfilled') {
        const users = usersResult.value;
        totalEmployees = users.length;
        recentEmployees = users.slice(0, 5).map(emp => ({
          empid: emp.empid,
          name: emp.name,
          role: emp.role,
          position: emp.position,
          type: emp.employee_type,
          createdAt: emp.date_of_joining || new Date(),
          profile_photo: emp.profile_photo
        }));
        
        if (attendanceResult.status === 'fulfilled') {
          const attendanceRecords = attendanceResult.value;
          
          // Count present attendance
          todayAttendance = attendanceRecords.filter(a => a.attendance_status === 'Present').length;
          
          // Find currently online users
          const loggedInUsers = [];
          users.forEach(user => {
            const userAttendance = attendanceRecords.filter(a => a.empid === user.empid);
            const currentlyLoggedIn = userAttendance.some(a => a.check_in && !a.check_out);
            
            if (currentlyLoggedIn) {
              const firstCheckIn = userAttendance.find(a => a.check_in)?.check_in;
              loggedInUsers.push({
                empid: user.empid,
                name: user.name,
                role: user.role,
                position: user.position,
                profile_photo: user.profile_photo,
                check_in: firstCheckIn,
                workingHours: firstCheckIn ? 
                  Math.round((new Date() - new Date(firstCheckIn)) / (1000 * 60 * 60) * 10) / 10 : 0
              });
            }
          });
          
          currentlyOnline = loggedInUsers;
          activeEmployees = currentlyOnline.length;
        }
      }
      
      if (leavesResult.status === 'fulfilled') {
        pendingLeaves = leavesResult.value;
      }
      
      if (candidatesResult.status === 'fulfilled') {
        totalCandidates = candidatesResult.value;
      }
      
    } catch (error) {
      console.error('Dashboard stats query error:', error);
      // Continue with default values
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
      currentlyOnline,
      recentEmployees
    });
    
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}