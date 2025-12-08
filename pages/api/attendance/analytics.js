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

    // Average working hours - calculate real-time from attendance data
    const currentTime = new Date();
    const realTimeHours = [];
    
    // Group attendance by employee-day and calculate real-time hours
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
    
    console.log('Analytics - realTimeHours:', realTimeHours);
    console.log('Analytics - avgWorkingHours:', avgWorkingHours);

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

  
    const trendData = await generateRealTrendData(period, startDate, endDate, prisma, totalEmployees);

    // Department-wise attendance
    const departmentData = await getDepartmentAttendance(startDate, endDate, prisma);

    // Pie chart - use same logic as trend data for accuracy
    const expectedTotalDays = totalEmployees * workingDays;
    const actualPresentDays = await prisma.attendance.count({
      where: {
        date: { gte: startDate, lte: endDate },
        attendance_status: 'Present'
      }
    });
    
    const pieAttendanceRate = expectedTotalDays ? Math.round((actualPresentDays / expectedTotalDays) * 100) : 0;
    const pieAbsenteeismRate = Math.max(0, 100 - pieAttendanceRate);
    
    const pieData = [
      { name: 'Present', value: pieAttendanceRate },
      { name: 'Absent', value: pieAbsenteeismRate },
    ];

    const analytics = {
      workingDays,
      totalEmployees,
      avgAttendance: pieAttendanceRate,
      absenteeismRate: pieAbsenteeismRate,
      avgCheckinTime,
      avgCheckoutTime: avgCheckoutTime || '--',
      avgWorkingHours,
      leaveUtilization,
      totalLeaveDays: period === 'today' ? employeesOnLeaveToday : totalLeaveDays,
      presentCount: actualPresentDays,
      absentCount: expectedTotalDays - actualPresentDays,
      lateCount: Math.floor(actualPresentDays * 0.15),
      presentPercent: pieAttendanceRate,
      absentPercent: pieAbsenteeismRate,
      latePercent: Math.max(0, 100 - pieAttendanceRate - pieAbsenteeismRate),
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
  // Common holidays (you can expand this list)
  const holidays = [
    '2024-01-01', '2024-01-26', '2024-08-15', '2024-10-02', '2024-12-25'
  ];
  
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];
    
    // Skip weekends and holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.includes(dateStr)) {
      count++;
    }
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

async function generateRealTrendData(period, startDate, endDate, prisma, totalEmployees) {
  const data = [];
  startDate = new Date(startDate);
  endDate = new Date(endDate);

  if (period === "year") {
    let current = new Date(startDate);

    for (let i = 0; i < 12 && current <= endDate; i++) {
      const periodStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const workingDays = calculateWorkingDays(periodStart, periodEnd);
      const expectedAttendanceDays = totalEmployees * workingDays;

      const presentCount = await prisma.attendance.count({
        where: {
          date: { gte: periodStart, lte: periodEnd },
          attendance_status: 'Present'
        }
      });

      data.push({
        period: current.toLocaleString("en-US", { month: "short" }),
        attendance: expectedAttendanceDays ? Math.round((presentCount / expectedAttendanceDays) * 100) : 0,
      });

      current.setMonth(current.getMonth() + 1);
    }
  }
  else if (period === "month") {
    let current = new Date(startDate);
    let week = 1;

    while (current <= endDate && week <= 5) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());
      
      const workingDays = calculateWorkingDays(weekStart, weekEnd);
      const expectedAttendanceDays = totalEmployees * workingDays;

      const presentCount = await prisma.attendance.count({
        where: {
          date: { gte: weekStart, lte: weekEnd },
          attendance_status: 'Present'
        }
      });

      data.push({
        period: `Week ${week}`,
        attendance: expectedAttendanceDays ? Math.round((presentCount / expectedAttendanceDays) * 100) : 0,
      });

      current.setDate(current.getDate() + 7);
      week++;
    }
  }
  else {
    // Daily attendance by hour ranges
    const timeRanges = [
      { start: 0, end: 8, label: "Before 9 AM" },
      { start: 9, end: 10, label: "9-10 AM" },
      { start: 11, end: 12, label: "11-12 PM" },
      { start: 13, end: 14, label: "1-2 PM" },
      { start: 15, end: 16, label: "3-4 PM" },
      { start: 17, end: 23, label: "After 5 PM" }
    ];

    for (const range of timeRanges) {
      const rangeStart = new Date(startDate);
      rangeStart.setHours(range.start, 0, 0, 0);
      const rangeEnd = new Date(startDate);
      rangeEnd.setHours(range.end, 59, 59, 999);

      const attendanceCount = await prisma.attendance.count({
        where: {
          date: { gte: startDate, lte: endDate },
          attendance_status: 'Present',
          check_in: { gte: rangeStart, lte: rangeEnd }
        }
      });

      data.push({ period: range.label, attendance: attendanceCount });
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
