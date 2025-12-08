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
    // Get total employees based on role permissions
    let totalEmployees = await prisma.users.count({
      where: { 
        status: { not: 'Inactive' },
        role: { in: getAccessibleRoles(user.role) }
      }
    });
    if (totalEmployees === 0) {
      totalEmployees = await prisma.users.count({
        where: { status: { not: 'Inactive' } }
      });
    }

    // Get attendance data
    const attendanceData = await prisma.attendance.findMany({
      where: { date: { gte: startDate, lte: endDate } }
    });

    // For today: count unique employees, for other periods: use all records
    let presentCount, absentCount, totalForCalculation;
    
    if (period === 'today') {
      // For today, count unique employees to avoid double-counting
      const uniqueEmployees = [...new Set(attendanceData.map(a => a.empid))];
      const employeeStatus = {};
      
      // Get the latest status for each employee today
      uniqueEmployees.forEach(empid => {
        const empRecords = attendanceData.filter(a => a.empid === empid);
        const latestRecord = empRecords.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))[0];
        employeeStatus[empid] = latestRecord?.attendance_status || 'Absent';
      });
      
      presentCount = Object.values(employeeStatus).filter(status => status === 'Present').length;
      
      // If no attendance records exist for today, show 0 present, 0 absent
      if (attendanceData.length === 0) {
        absentCount = 0;
        totalForCalculation = 1; // Avoid division by zero
      } else {
        absentCount = totalEmployees - presentCount;
        totalForCalculation = totalEmployees;
      }
    } else {
      // For month/year, calculate based on employee-days
      const expectedAttendanceDays = totalEmployees * workingDays;
      
      // Count unique employee-day combinations
      const employeeDayMap = new Map();
      attendanceData.forEach(record => {
        const dateKey = record.date.toDateString();
        const empDayKey = `${record.empid}-${dateKey}`;
        
        if (!employeeDayMap.has(empDayKey)) {
          employeeDayMap.set(empDayKey, record.attendance_status);
        } else {
          // If multiple records for same employee-day, prioritize Present over Absent
          if (record.attendance_status === 'Present') {
            employeeDayMap.set(empDayKey, 'Present');
          }
        }
      });
      
      presentCount = Array.from(employeeDayMap.values()).filter(status => status === 'Present').length;
      const recordedDays = employeeDayMap.size;
      absentCount = expectedAttendanceDays - presentCount;
      totalForCalculation = expectedAttendanceDays;
    }

    const avgAttendance = totalForCalculation > 0 ? Math.round((presentCount / totalForCalculation) * 100) : 0;
    const absenteeismRate = totalForCalculation > 0 ? Math.round((absentCount / totalForCalculation) * 100) : 0;

    // Average check-in/out
    // Get first check-in and last check-out per employee per day
   function extractDailyTimes(attendance) {
  const map = new Map();

  attendance.forEach(record => {
    const dateKey = record.date.toISOString().split("T")[0]; // prevents timezone issues
    const key = `${record.empid}-${dateKey}`;

    if (!map.has(key)) {
      map.set(key, {
        checkin: record.check_in ? new Date(record.check_in) : null,
        checkout: record.check_out ? new Date(record.check_out) : null,
      });
    } else {
      const entry = map.get(key);

      // earliest check-in
      if (record.check_in) {
        const ci = new Date(record.check_in);
        if (!entry.checkin || ci < entry.checkin) {
          entry.checkin = ci;
        }
      }

      // latest check-out
      if (record.check_out) {
        const co = new Date(record.check_out);
        if (!entry.checkout || co > entry.checkout) {
          entry.checkout = co;
        }
      }
    }
  });

  return Array.from(map.values());
}

// Convert date → minutes
function toMinutes(dateObj) {
  return dateObj.getHours() * 60 + dateObj.getMinutes();
}

// Convert minutes →  "HH:MM"
function formatTime(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// Get median from an array of numbers
function median(values) {
  if (!values || values.length === 0) return "--";

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 !== 0) {
    return formatTime(sorted[mid]);
  }

  // average of two middle values for even count
  return formatTime(Math.round((sorted[mid - 1] + sorted[mid]) / 2));
}

// ---- MAIN FLOW ----

// Build structured per-day times
const daily = extractDailyTimes(attendanceData);

// Extract check-in minutes
const checkInMinutes = daily
  .filter(d => d.checkin)
  .map(d => toMinutes(d.checkin));

// Extract check-out minutes
const checkOutMinutes = daily
  .filter(d => d.checkout)
  .map(d => toMinutes(d.checkout));

// Final median check-in/out times
const medianCheckinTime = median(checkInMinutes);
const medianCheckoutTime = median(checkOutMinutes);
    const avgCheckinTime = medianCheckinTime || '--';
    const avgCheckoutTime = medianCheckoutTime || '--';

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
      presentCount,
      absentCount,
      lateCount: Math.floor(presentCount * 0.15),
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
      
      // Use employee-day logic for consistency
      const employeeDayMap = new Map();
      attendanceRecords.forEach(record => {
        const dateKey = record.date.toDateString();
        const empDayKey = `${record.empid}-${dateKey}`;
        if (!employeeDayMap.has(empDayKey)) {
          employeeDayMap.set(empDayKey, record.attendance_status);
        } else if (record.attendance_status === 'Present') {
          employeeDayMap.set(empDayKey, 'Present');
        }
      });
      
      const presentCount = Array.from(employeeDayMap.values()).filter(status => status === 'Present').length;
      const totalCount = employeeDayMap.size;
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
      
      // Use employee-day logic for consistency
      const employeeDayMap = new Map();
      attendanceRecords.forEach(record => {
        const dateKey = record.date.toDateString();
        const empDayKey = `${record.empid}-${dateKey}`;
        if (!employeeDayMap.has(empDayKey)) {
          employeeDayMap.set(empDayKey, record.attendance_status);
        } else if (record.attendance_status === 'Present') {
          employeeDayMap.set(empDayKey, 'Present');
        }
      });
      
      const presentCount = Array.from(employeeDayMap.values()).filter(status => status === 'Present').length;
      const totalCount = employeeDayMap.size;
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
    
    // Use employee-day logic for consistency
    const employeeDayMap = new Map();
    userAttendance.forEach(record => {
      const dateKey = record.date.toDateString();
      const empDayKey = `${record.empid}-${dateKey}`;
      if (!employeeDayMap.has(empDayKey)) {
        employeeDayMap.set(empDayKey, record.attendance_status);
      } else if (record.attendance_status === 'Present') {
        employeeDayMap.set(empDayKey, 'Present');
      }
    });
    
    roleStats[user.role].present += Array.from(employeeDayMap.values()).filter(status => status === 'Present').length;
    roleStats[user.role].total += employeeDayMap.size;
  }

  return Object.entries(roleStats)
    .filter(([_, stats]) => stats.total > 0)
    .map(([role, stats]) => ({
      department: role.toUpperCase(),
      attendance: Math.round((stats.present / stats.total) * 100)
    }));
}
