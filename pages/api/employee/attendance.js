import { verifyEmployeeToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await verifyEmployeeToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }

    const { month, year } = req.query;
    
    // Validate month and year
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    if (targetMonth < 0 || targetMonth > 11) {
      return res.status(400).json({ message: 'Invalid month. Must be between 1-12' });
    }
    
    if (targetYear < 2020 || targetYear > 2030) {
      return res.status(400).json({ message: 'Invalid year. Must be between 2020-2030' });
    }

    // Get target month's attendance records for the authenticated employee only
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        empid: user.empid,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        date: true,
        check_in: true,
        check_out: true,
        total_hours: true,
        attendance_status: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Group by date and aggregate multiple check-ins/check-outs
    const groupedAttendance = {};
    
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      
      if (!groupedAttendance[dateKey]) {
        groupedAttendance[dateKey] = {
          date: record.date,
          attendance_status: record.attendance_status,
          check_ins: [],
          check_outs: [],
        };
      }
      
      if (record.check_in) {
        groupedAttendance[dateKey].check_ins.push(record.check_in);
      }
      if (record.check_out) {
        groupedAttendance[dateKey].check_outs.push(record.check_out);
      }
    });

    // Process aggregated data
    const processedAttendance = Object.values(groupedAttendance).map(dayRecord => {
      const firstCheckIn = dayRecord.check_ins.length > 0 
        ? new Date(Math.min(...dayRecord.check_ins.map(time => new Date(time))))
        : null;
      
      const lastCheckOut = dayRecord.check_outs.length > 0
        ? new Date(Math.max(...dayRecord.check_outs.map(time => new Date(time))))
        : null;
      
      // Calculate total working time from all check-in/check-out pairs
      let totalWorkingMinutes = 0;
      const sortedCheckIns = dayRecord.check_ins.sort();
      const sortedCheckOuts = dayRecord.check_outs.sort();
      
      for (let i = 0; i < Math.min(sortedCheckIns.length, sortedCheckOuts.length); i++) {
        const checkIn = new Date(sortedCheckIns[i]);
        const checkOut = new Date(sortedCheckOuts[i]);
        totalWorkingMinutes += (checkOut - checkIn) / (1000 * 60);
      }
      
      return {
        date: dayRecord.date,
        attendance_status: dayRecord.attendance_status,
        check_in: firstCheckIn,
        check_out: lastCheckOut,
        total_hours: dayRecord.total_hours || (totalWorkingMinutes / 60),
        total_working_minutes: totalWorkingMinutes,
        status: dayRecord.attendance_status || ((totalWorkingMinutes >= 240) ? 'Present' : 'Absent'),
      };
    });

    res.status(200).json(processedAttendance);
  } catch (error) {
    console.error('Error fetching employee attendance:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Authentication token expired' });
    }
    
    res.status(500).json({ message: 'Internal server error while fetching attendance' });
  }
}