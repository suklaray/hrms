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

  const { period = 'today' } = req.query;

  try {
    const now = new Date();
    let startDate, endDate;

    // Calculate date range based on period
    if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else { // today
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    }

    // Calculate working days (excluding weekends)
    const workingDays = period === 'today' ? 1 : calculateWorkingDays(startDate, endDate);

    // Get total employees based on role permissions
    // Get total employees based on role permissions (excluding self)
    let totalEmployees = await prisma.users.count({
      where: { 
        status: { not: 'Inactive' },
        role: { in: getAccessibleRoles(user.role) },
        empid: { not: user.empid }  // Exclude current user
      }
    });
    if (totalEmployees === 0) {
      totalEmployees = await prisma.users.count({
        where: { empid: { not: user.empid } }  // Exclude current user from fallback too
      });
    }

    // Get attendance data
    const attendanceData = await prisma.attendance.findMany({
      where: { date: { gte: startDate, lte: endDate } }
    });

    // Unique employee IDs for today to avoid double-counting multiple records
    const employeeIds = [...new Set(attendanceData.map(a => a.empid))];

    const presentRecords = attendanceData.filter(a => a.attendance_status === 'Present').length;
    const absentRecords = attendanceData.filter(a => a.attendance_status === 'Absent').length;
    const totalAttendanceRecords = attendanceData.length;

    const avgAttendance = totalAttendanceRecords > 0 ? Math.round((presentRecords / totalAttendanceRecords) * 100) : 0;
    const absenteeismRate = totalAttendanceRecords > 0 ? Math.round((absentRecords / totalAttendanceRecords) * 100) : 0;

    // Average check-in/out
    // Get first check-in and last check-out per employee per day
    const dailyTimes = {};
    attendanceData.forEach(record => {
      const dateKey = record.date.toDateString();
      const empKey = `${record.empid}-${dateKey}`;
      
      if (!dailyTimes[empKey]) {
        dailyTimes[empKey] = { checkin: null, checkout: null };
      }
      
      // First check-in of the day
      if (record.check_in && (!dailyTimes[empKey].checkin || record.check_in < dailyTimes[empKey].checkin)) {
        dailyTimes[empKey].checkin = record.check_in;
      }
      
      // Last check-out of the day
      if (record.check_out && (!dailyTimes[empKey].checkout || record.check_out > dailyTimes[empKey].checkout)) {
        dailyTimes[empKey].checkout = record.check_out;
      }
    });

    const firstCheckins = Object.values(dailyTimes).map(d => d.checkin).filter(Boolean);
    const lastCheckouts = Object.values(dailyTimes).map(d => d.checkout).filter(Boolean);

    const avgCheckinTime = calculateAverageTime(firstCheckins);
    const avgCheckoutTime = calculateAverageTime(lastCheckouts);


    // Average working hours
    const workingHoursRecords = attendanceData.filter(a => a.total_hours);
    const avgWorkingHours = workingHoursRecords.length > 0
      ? Math.round(workingHoursRecords.reduce((sum, a) => sum + parseFloat(a.total_hours || 0), 0) / workingHoursRecords.length * 10) / 10
      : 0;

    // Leave utilization
    const leaveRequests = await prisma.leave_requests.findMany({
      where: {
        from_date: { lte: endDate },
        to_date: { gte: startDate },
        status: 'Approved'
      }
    });

  console.log(`Period: ${period}, Leave requests found: ${leaveRequests.length}`);
  console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    const totalLeaveDays = leaveRequests.reduce((sum, leave) => {
      const leaveStart = new Date(Math.max(new Date(leave.from_date), startDate));
      const leaveEnd = new Date(Math.min(new Date(leave.to_date), endDate));
      const days = Math.ceil((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;
      return sum + Math.max(0, days);
    }, 0);
    console.log(`Total leave days calculated: ${totalLeaveDays}`);

    const employeesOnLeaveToday = period === 'today'
      ? new Set(leaveRequests.map(leave => leave.empid)).size
      : 0;

    const leaveUtilization = period === 'year' 
      ? totalLeaveDays
      : period === 'month'
        ? totalLeaveDays  // Show total leave days for month too
        : totalLeaveDays > 0 
          ? Math.round(totalLeaveDays / Math.max(totalEmployees, 1))
          : 0;

  
    const trendData = await generateRealTrendData(period, startDate, endDate, prisma);

    // Department-wise attendance
    const departmentData = await getDepartmentAttendance(startDate, endDate, prisma);

    // Pie chart
    const pieData = [
      { name: 'Present', value: avgAttendance },
      { name: 'Absent', value: absenteeismRate },
    ];

    const analytics = {
      workingDays,
      totalEmployees,
      avgAttendance,
      absenteeismRate,
      avgCheckinTime,
      avgCheckoutTime: avgCheckoutTime || '--',
      avgWorkingHours,
      leaveUtilization,
      totalLeaveDays: period === 'today' ? employeesOnLeaveToday : totalLeaveDays,
      presentCount: presentRecords,
      absentCount: absentRecords,
      lateCount: Math.floor(presentRecords * 0.15),
      presentPercent: avgAttendance,
      absentPercent: absenteeismRate,
      latePercent: Math.max(0, 100 - avgAttendance - absenteeismRate),
      trendData,
      departmentData,
      yearlyPieData: pieData
    };

    res.status(200).json(analytics);
  } catch (error) {
    console.error('Error fetching attendance analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ------------------ Helper Functions ------------------

function calculateWorkingDays(startDate, endDate) {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function calculateAverageTime(times) {
  if (!times.length) return null;
  const totalMinutes = times.reduce((sum, t) => {
    const date = new Date(t);
    if (isNaN(date.getTime())) return sum;
    return sum + date.getHours() * 60 + date.getMinutes();
  }, 0);
  const avgMinutes = Math.round(totalMinutes / times.length);
  const hours = Math.floor(avgMinutes / 60);
  const minutes = avgMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

async function generateRealTrendData(period, startDate, endDate, prisma) {
  const data = [];

  if (period === 'year') {
    const current = new Date(startDate);
    while (current <= endDate) {
      const periodStart = new Date(current.getFullYear(), current.getMonth(), 1, 0, 0, 0, 0);
      const periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
      const attendanceRecords = await prisma.attendance.findMany({
        where: { date: { gte: periodStart, lte: periodEnd } }
      });
      const presentCount = attendanceRecords.filter(a => a.attendance_status === 'Present').length;
      const totalCount = attendanceRecords.length;
      data.push({ period: current.toLocaleDateString('en-US', { month: 'short' }), attendance: totalCount ? Math.round((presentCount / totalCount) * 100) : 0 });
      current.setMonth(current.getMonth() + 1);
      if (data.length >= 12) break;
    }
  } else if (period === 'month') {
    const current = new Date(startDate);
    let weekNum = 1;
    while (current <= endDate) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());
      const attendanceRecords = await prisma.attendance.findMany({
        where: { date: { gte: weekStart, lte: weekEnd } }
      });
      const presentCount = attendanceRecords.filter(a => a.attendance_status === 'Present').length;
      const totalCount = attendanceRecords.length;
      data.push({ period: `Week ${weekNum}`, attendance: totalCount ? Math.round((presentCount / totalCount) * 100) : 0 });
      current.setDate(current.getDate() + 7);
      weekNum++;
      if (weekNum > 5) break;
    }
  } else {
    const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    for (const hour of hours) {
      const hourStart = new Date(startDate);
      hourStart.setHours(hour, 0, 0, 0);
      const hourEnd = new Date(startDate);
      hourEnd.setHours(hour, 59, 59, 999);
      const attendanceRecords = await prisma.attendance.findMany({
        where: { date: { gte: startDate, lte: endDate }, check_in: { gte: hourStart, lte: hourEnd } }
      });
      const checkedInCount = attendanceRecords.length;
      const label = hour > 12 ? `${hour - 12} PM` : `${hour} ${hour === 12 ? 'PM' : 'AM'}`;
      data.push({ period: label, attendance: checkedInCount });
    }
  }

  return data;
}

async function getDepartmentAttendance(startDate, endDate, prisma) {
  const users = await prisma.users.findMany({
    where: { status: 'Active' },
    select: { empid: true, role: true }
  });

  const roleStats = {};
  for (const user of users) {
    if (!roleStats[user.role]) roleStats[user.role] = { present: 0, total: 0 };
    const userAttendance = await prisma.attendance.findMany({
      where: { empid: user.empid, date: { gte: startDate, lte: endDate } }
    });
    roleStats[user.role].present += userAttendance.filter(a => a.attendance_status === 'Present').length;
    roleStats[user.role].total += userAttendance.length;
  }

  return Object.entries(roleStats)
    .filter(([_, stats]) => stats.total > 0)
    .map(([role, stats]) => ({
      department: role.toUpperCase(),
      attendance: Math.round((stats.present / stats.total) * 100)
    }));
}
