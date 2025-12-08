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

    // Get all users with role filtering
    const users = await prisma.users.findMany({
      where: {
        role: { in: roleFilter },
        status: { not: 'Inactive' }
      },
      select: {
        empid: true,
        name: true,
        email: true,
        role: true,
        status: true
      }
    });

    // Get attendance data for same period as analytics (today for attendance page)
    const attendanceData = await prisma.attendance.findMany({
      where: {
        date: { gte: startOfDay, lte: endOfDay },
        empid: { in: users.map(u => u.empid) }
      },
      orderBy: [{ empid: 'asc' }, { check_in: 'asc' }]
    });

    const results = users.map(user => {
      const userAttendance = attendanceData.filter(a => a.empid === user.empid);
      
      // Get first check-in and last check-out
      const firstCheckIn = userAttendance.find(a => a.check_in)?.check_in;
      const lastCheckOut = userAttendance.filter(a => a.check_out).pop()?.check_out;
      
      // Check if currently logged in (has check-in without check-out)
      const currentlyLoggedIn = userAttendance.some(a => a.check_in && !a.check_out);
      
      // Calculate total seconds (real-time for logged in users)
      let totalSeconds = 0;
      let completedSeconds = 0;
      
      userAttendance.forEach(record => {
        if (record.check_in) {
          const checkIn = new Date(record.check_in);
          const checkOut = record.check_out ? new Date(record.check_out) : new Date();
          const sessionSeconds = (checkOut - checkIn) / 1000;
          
          totalSeconds += sessionSeconds;
          
          if (record.check_out) {
            completedSeconds += sessionSeconds;
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
        today_checkin: currentlyLoggedIn ? firstCheckIn : null,
        today_total_seconds: Math.floor(totalSeconds),
        today_completed_seconds: Math.floor(completedSeconds),
        status: user.status
      };
    });

    // Calculate average hours using same method as analytics
    const currentTime = new Date();
    const realTimeHours = [];
    
    // Group attendance by employee-day (EXACT same as analytics)
    const hoursEmployeeDayMap = new Map();
    attendanceData.forEach(record => {
      const dateKey = record.date.toDateString(); // EXACT same as analytics
      const empDayKey = `${record.empid}-${dateKey}`;
      
      if (!hoursEmployeeDayMap.has(empDayKey)) {
        hoursEmployeeDayMap.set(empDayKey, []);
      }
      hoursEmployeeDayMap.get(empDayKey).push(record);
    });
    
    // Calculate total hours for each employee-day (EXACT same as analytics)
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
    
    // console.log('Attendance - realTimeHours:', realTimeHours);
    // console.log('Attendance - avgWorkingHours:', avgWorkingHours);

    const finalAttendanceData = results.map((user) => {
      const userAttendance = attendanceData.filter(a => a.empid === user.empid);
      const attendance_status = (user.today_total_seconds || 0) >= 14400 ? "Present" : "Absent";
      
      // Determine attendance status based on check-in/check-out state
      const attendanceSessionStatus = user.today_checkin ? "Logged In" : "Logged Out";
      
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
        today_checkin: user.today_checkin ? user.today_checkin.toISOString() : null,
        today_completed_seconds: user.today_completed_seconds || 0,
        today_total_seconds: user.today_total_seconds || 0,
        total_hours: userRealTimeHours.toFixed(1),
        attendance_status,
        status: attendanceSessionStatus,
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
