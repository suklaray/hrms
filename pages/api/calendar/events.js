import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Check authentication
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(403).json({ message: "Invalid token" });
    }

    const { month, year } = req.query;
    
    // Default to current month/year if not provided
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Get birthdays from users table (using date_of_joining as DOB)
    const birthdays = await prisma.users.findMany({
      where: {
        status: { not: "Inactive" },
        date_of_joining: { not: null }
      },
      select: {
        empid: true,
        name: true,
        date_of_joining: true
      }
    });

    // Get approved leaves for the month
    const approvedLeaves = await prisma.leave_requests.findMany({
      where: {
        status: "Approved",
        OR: [
          {
            AND: [
              { from_date: { lte: new Date(targetYear, targetMonth, 0) } },
              { to_date: { gte: new Date(targetYear, targetMonth - 1, 1) } }
            ]
          }
        ]
      },
      select: {
        empid: true,
        name: true,
        from_date: true,
        to_date: true,
        leave_type: true,
        reason: true
      }
    });

    const events = [];

    // Process birthdays
    birthdays.forEach(employee => {
      if (employee.date_of_joining) {
        const doj = new Date(employee.date_of_joining);
        const birthdayThisYear = new Date(targetYear, doj.getMonth(), doj.getDate());
        
        if (birthdayThisYear.getMonth() + 1 === targetMonth) {
          events.push({
            id: `birthday-${employee.empid}`,
            type: "birthday",
            date: birthdayThisYear.toISOString().split('T')[0],
            employee: employee.name,
            title: `🎂 ${employee.name}'s Birthday`,
            color: "#f59e0b"
          });
        }
      }
    });

    // Process approved leaves
    approvedLeaves.forEach(leave => {
      const fromDate = new Date(leave.from_date);
      const toDate = new Date(leave.to_date);
      
      const currentDate = new Date(fromDate);
      while (currentDate <= toDate) {
        if (currentDate.getMonth() + 1 === targetMonth && currentDate.getFullYear() === targetYear) {
          events.push({
            id: `leave-${leave.empid}-${currentDate.toISOString().split('T')[0]}`,
            type: "leave",
            date: currentDate.toISOString().split('T')[0],
            employee: leave.name,
            leave_type: leave.leave_type,
            reason: leave.reason,
            title: `🏖️ ${leave.name} - ${leave.leave_type}`,
            color: "#ef4444"
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // Add predefined holidays
    const holidays = [
      { date: `${targetYear}-01-01`, name: "New Year's Day" },
      { date: `${targetYear}-01-01`, name: "Republic Day" },
      { date: `${targetYear}-08-15`, name: "Independence Day" },
      { date: `${targetYear}-10-02`, name: "Gandhi Jayanti" },
      { date: `${targetYear}-12-25`, name: "Christmas Day" }
    ];

    holidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      if (holidayDate.getMonth() + 1 === targetMonth) {
        events.push({
          id: `holiday-${holiday.date}`,
          type: "holiday",
          date: holiday.date,
          name: holiday.name,
          title: ` ${holiday.name}`,
          color: "#10b981"
        });
      }
    });

    // Sort events by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({
      success: true,
      events,
      month: targetMonth,
      year: targetYear,
      total: events.length
    });

  } catch (error) {
    console.error("Calendar events API error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: error.message 
    });
  }
}
