import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get total employees
    const totalEmployees = await prisma.users.count({
      where: { status: "Active" }
    });

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Calculate present: those with Present status OR worked >= 4 hours
    const presentToday = todayAttendance.filter(a => 
      a.attendance_status === "Present" || 
      (a.total_hours && parseFloat(a.total_hours) >= 4)
    ).length;
    
    // Absent = Total employees - Present - On Leave
    const todayLeaves = await prisma.leave_requests.count({
      where: {
        from_date: { lte: today },
        to_date: { gte: today },
        status: "Approved"
      }
    });
    
    const absentToday = totalEmployees - presentToday - todayLeaves;

    // Get weekly attendance data
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    const weeklyData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      const dayAttendance = await prisma.attendance.findMany({
        where: {
          date: {
            gte: day,
            lt: nextDay
          }
        }
      });

      const present = dayAttendance.filter(a => 
        a.attendance_status === "Present" || 
        (a.total_hours && parseFloat(a.total_hours) >= 4)
      ).length;
      const absent = Math.max(0, totalEmployees - present);

      weeklyData.push({
        name: days[i],
        Present: present,
        Absent: absent
      });
    }

    // Get monthly stats
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const monthlyAttendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    });

    const monthlyPresent = monthlyAttendance.filter(a => 
      a.attendance_status === "Present" || 
      (a.total_hours && parseFloat(a.total_hours) >= 4)
    ).length;
    const monthlyAbsent = Math.max(0, (totalEmployees * 30) - monthlyPresent);

    // Get yearly stats
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const yearEnd = new Date(today.getFullYear(), 11, 31);
    
    const yearlyAttendance = await prisma.attendance.findMany({
      where: {
        date: {
          gte: yearStart,
          lte: yearEnd
        }
      }
    });

    const yearlyPresent = yearlyAttendance.filter(a => 
      a.attendance_status === "Present" || 
      (a.total_hours && parseFloat(a.total_hours) >= 4)
    ).length;
    const yearlyAbsent = Math.max(0, (totalEmployees * 365) - yearlyPresent);



    res.status(200).json({
      summary: {
        totalEmployees,
        presentToday,
        absentToday,
        onLeave: todayLeaves,
        workingToday: totalEmployees - absentToday - todayLeaves
      },
      weeklyData,
      monthlyStats: [
        { name: "Present", value: monthlyPresent },
        { name: "Absent", value: monthlyAbsent }
      ],
      yearlyStats: [
        { name: "Present", value: yearlyPresent },
        { name: "Absent", value: yearlyAbsent }
      ]
    });

  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics data" });
  }
}