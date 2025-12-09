import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { getAccessibleRoles } from "@/lib/roleBasedAccess";

const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get user from token
    const cookies = cookie.parse(req.headers.cookie || '');
    const { token } = cookies;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: { empid: true, role: true }
    });

    if (!currentUser || !['hr', 'admin', 'superadmin'].includes(currentUser.role)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Define role-based filtering using standardized function
    const roleFilter = getAccessibleRoles(currentUser.role);

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Get all users with role filtering + current user
    const users = await prisma.users.findMany({
      where: {
        OR: [
          { role: { in: roleFilter }, status: { not: 'Inactive' } },
          { empid: currentUser.empid, status: { not: 'Inactive' } }
        ]
      },
      select: {
        empid: true,
        name: true,
        email: true,
        role: true,
        status: true
      }
    });

    // Get attendance data using same logic as dashboard
    const attendanceData = await prisma.attendance.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        check_in: { not: null }
      },
      select: {
        empid: true,
        check_in: true,
        check_out: true,
        date: true,
        total_hours: true,
        attendance_status: true
      }
    });
    
    // Filter by role permissions
    const roleFilteredAttendance = attendanceData.filter(record => 
      users.some(u => u.empid === record.empid)
    );

    const results = users.map(user => {
      const userAttendance = roleFilteredAttendance.filter(a => a.empid === user.empid);
      
      // Sort by check_in time to process sessions in order
      const sortedAttendance = userAttendance.sort((a, b) => new Date(a.check_in) - new Date(b.check_in));
      
      // Get first check-in and last check-out
      const firstCheckIn = sortedAttendance.find(a => a.check_in)?.check_in;
      const lastCheckOut = sortedAttendance.filter(a => a.check_out).reverse()[0]?.check_out;
      
      // Check if currently logged in (has ANY check_in without check_out in ANY session)
      const hasOpenSession = sortedAttendance.some(a => a.check_in && !a.check_out);
      
      // Calculate total seconds (real-time for logged in users)
      let totalSeconds = 0;
      let completedSeconds = 0;
      let currentSessionCheckIn = null; // Track the CURRENT open session check-in
      
      sortedAttendance.forEach(record => {
        if (record.check_in) {
          const checkIn = new Date(record.check_in);
          const checkOut = record.check_out ? new Date(record.check_out) : new Date();
          const sessionSeconds = (checkOut - checkIn) / 1000;
          
          totalSeconds += sessionSeconds;
          
          if (record.check_out) {
            completedSeconds += sessionSeconds;
          } else {
            // This is the open session - store its check-in time
            currentSessionCheckIn = record.check_in;
          }
        }
      });
      
      return {
        empid: user.empid,
        name: user.name,
        email: user.email,
        role: user.role,
        last_login: firstCheckIn,
        today_checkout: lastCheckOut,
        current_session_checkin: currentSessionCheckIn, // NEW: Current open session
        today_total_seconds: Math.floor(totalSeconds),
        today_completed_seconds: Math.floor(completedSeconds),
        status: user.status,
        has_open_session: hasOpenSession
      };
    });

    // Calculate average hours using same method as analytics
    const currentTime = new Date();
    const realTimeHours = [];
    
    // Group attendance by employee-day
    const hoursEmployeeDayMap = new Map();
    attendanceData.forEach(record => {
      const dateKey = record.date.toDateString();
      const empDayKey = `${record.empid}-${dateKey}`;
      
      if (!hoursEmployeeDayMap.has(empDayKey)) {
        hoursEmployeeDayMap.set(empDayKey, []);
      }
      hoursEmployeeDayMap.get(empDayKey).push(record);
    });
    
    // Calculate total hours for each employee-day
    hoursEmployeeDayMap.forEach(dayRecords => {
      let totalSeconds = 0;
      dayRecords.forEach(record => {
        if (record.check_in) {
          const checkIn = new Date(record.check_in);
          const checkOut = record.check_out ? new Date(record.check_out) : currentTime;
          totalSeconds += (checkOut - checkIn) / 1000;
        }
      });
      if (totalSeconds > 0) {
        realTimeHours.push(totalSeconds / 3600);
      }
    });
    
    const avgWorkingHours = realTimeHours.length > 0
      ? (realTimeHours.reduce((a, b) => a + b, 0) / realTimeHours.length).toFixed(1)
      : '0';

    const finalAttendanceData = results.map((user) => {
      const userAttendance = roleFilteredAttendance.filter(a => a.empid === user.empid);
      const attendance_status = (user.today_total_seconds || 0) >= 14400 ? "Present" : "Absent";
      
      // Use EXACT same calculation as analytics for individual user hours
      let userTotalSeconds = 0;
      userAttendance.forEach(record => {
        if (record.check_in) {
          const checkIn = new Date(record.check_in);
          const checkOut = record.check_out ? new Date(record.check_out) : currentTime;
          userTotalSeconds += (checkOut - checkIn) / 1000;
        }
      });
      const userRealTimeHours = userTotalSeconds / 3600;

      return {
        empid: user.empid,
        name: user.name,
        email: user.email,
        role: user.role,
        last_login: user.last_login ? user.last_login.toISOString() : null,
        last_logout: user.today_checkout ? user.today_checkout.toISOString() : null,
        current_checkin: user.current_session_checkin ? user.current_session_checkin.toISOString() : null,
        today_completed_seconds: user.today_completed_seconds || 0,
        today_total_seconds: user.today_total_seconds || 0,
        total_hours: userRealTimeHours.toFixed(1),
        attendance_status,
        is_logged_in: user.has_open_session
      };
    });

    res.status(200).json({
      data: finalAttendanceData,
      avgHours: avgWorkingHours
    });
  } catch (error) {
    console.error("Attendance API Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}