import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { getAccessibleRoles } from "@/lib/roleBasedAccess";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const user = getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  const { period = 'month' } = req.query;

  try {
    const now = new Date();
    let startDate, endDate;

    // Calculate date range based on period
    switch (period) {
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Calculate working days (excluding weekends)
    const workingDays = calculateWorkingDays(startDate, endDate);

    // Get total employees based on role permissions
    const totalEmployees = await prisma.users.count({
      where: { 
        status: 'Active',
        role: { in: getAccessibleRoles(user.role) }
      }
    });

    // Get attendance data for the period
    const attendanceData = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Calculate metrics
    const totalAttendanceRecords = attendanceData.length;
    const presentRecords = attendanceData.filter(a => a.attendance_status === 'Present').length;
    const absentRecords = attendanceData.filter(a => a.attendance_status === 'Absent').length;
    
    const avgAttendance = totalAttendanceRecords > 0 ? Math.round((presentRecords / totalAttendanceRecords) * 100) : 0;
    const absenteeismRate = totalAttendanceRecords > 0 ? Math.round((absentRecords / totalAttendanceRecords) * 100) : 0;

    // Calculate average check-in/out times
    const checkedInRecords = attendanceData.filter(a => a.check_in);
    const checkedOutRecords = attendanceData.filter(a => a.check_out);
    
    const avgCheckinTime = calculateAverageTime(checkedInRecords.map(a => a.check_in));
    const avgCheckoutTime = calculateAverageTime(checkedOutRecords.map(a => a.check_out));

    // Calculate average working hours
    const workingHoursRecords = attendanceData.filter(a => a.total_hours);
    const avgWorkingHours = workingHoursRecords.length > 0 
      ? Math.round(workingHoursRecords.reduce((sum, a) => sum + parseFloat(a.total_hours || 0), 0) / workingHoursRecords.length * 10) / 10
      : 0;

    // Get leave utilization
    const leaveRequests = await prisma.leave_requests.findMany({
      where: {
        from_date: { gte: startDate },
        to_date: { lte: endDate },
        status: 'Approved'
      }
    });

    const totalLeaveDays = leaveRequests.reduce((sum, leave) => {
      const days = Math.ceil((new Date(leave.to_date) - new Date(leave.from_date)) / (1000 * 60 * 60 * 24)) + 1;
      return sum + days;
    }, 0);

    const leaveUtilization = totalEmployees > 0 ? Math.round((totalLeaveDays / (totalEmployees * workingDays)) * 100) : 0;

    // Generate trend data
    const trendData = generateTrendData(period, startDate, endDate);

    // Filter roles based on user permissions
    const allowedRoles = getAccessibleRoles(user.role);

    // Get users based on permissions
    const users = await prisma.users.findMany({
      where: { 
        status: 'Active',
        role: { in: allowedRoles }
      },
      select: { empid: true, role: true }
    });

    const roleStats = {};
    allowedRoles.forEach(role => {
      roleStats[role] = { present: 0, total: 0 };
    });
    
    for (const user of users) {
      const userAttendance = attendanceData.filter(a => a.empid === user.empid);
      const presentCount = userAttendance.filter(a => a.attendance_status === 'Present').length;
      const totalCount = userAttendance.length;
      
      if (totalCount > 0) {
        roleStats[user.role].present += presentCount;
        roleStats[user.role].total += totalCount;
      }
    }

    const departmentData = Object.entries(roleStats)
      .filter(([role, stats]) => stats.total > 0)
      .map(([role, stats]) => ({
        department: role.toUpperCase(),
        attendance: Math.round((stats.present / stats.total) * 100)
      }));

    console.log('Department Data:', departmentData);
    console.log('Role Stats:', roleStats);
    console.log('Users found:', users.length);
    console.log('Attendance records:', attendanceData.length);

    // Generate weekly pattern
    const weeklyPattern = [
      { day: 'Monday', attendance: 75 },
      { day: 'Tuesday', attendance: 90 },
      { day: 'Wednesday', attendance: 92 },
      { day: 'Thursday', attendance: 88 },
      { day: 'Friday', attendance: 80 },
      { day: 'Saturday', attendance: 65 },
      { day: 'Sunday', attendance: 45 }
    ];

    // Generate yearly pie chart data
    const yearlyPieData = [
      { name: 'Present', value: avgAttendance },
      { name: 'Absent', value: absenteeismRate },
      { name: 'Late', value: Math.max(0, 100 - avgAttendance - absenteeismRate) }
    ];

    const analytics = {
      workingDays,
      totalEmployees,
      avgAttendance,
      absenteeismRate,
      avgCheckinTime,
      avgCheckoutTime,
      avgWorkingHours,
      leaveUtilization,
      presentCount: presentRecords,
      absentCount: absentRecords,
      lateCount: Math.floor(presentRecords * 0.15),
      presentPercent: avgAttendance,
      absentPercent: absenteeismRate,
      latePercent: Math.max(0, 100 - avgAttendance - absenteeismRate),
      trendData,
      departmentData,
      weeklyPattern,
      yearlyPieData
    };

    res.status(200).json(analytics);
  } catch (error) {
    console.error('Error fetching attendance analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

function calculateWorkingDays(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

function calculateAverageTime(times) {
  if (!times.length) return '--:--';
  
  const totalMinutes = times.reduce((sum, time) => {
    if (!time) return sum;
    const date = new Date(time);
    return sum + (date.getHours() * 60 + date.getMinutes());
  }, 0);
  
  const avgMinutes = Math.round(totalMinutes / times.length);
  const hours = Math.floor(avgMinutes / 60);
  const minutes = avgMinutes % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function generateTrendData(period, startDate, endDate) {
  const data = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    let label;
    if (period === 'year') {
      label = current.toLocaleDateString('en-US', { month: 'short' });
      current.setMonth(current.getMonth() + 1);
    } else if (period === 'quarter') {
      label = `Week ${Math.ceil(current.getDate() / 7)}`;
      current.setDate(current.getDate() + 7);
    } else {
      label = current.getDate().toString();
      current.setDate(current.getDate() + 1);
    }
    
    // Generate mock trend data with some variation
    const baseAttendance = 85;
    const variation = Math.random() * 20 - 10; // ±10%
    const attendance = Math.max(60, Math.min(100, Math.round(baseAttendance + variation)));
    
    data.push({ period: label, attendance });
    
    if (data.length >= 12) break; // Limit data points
  }
  
  return data;
}