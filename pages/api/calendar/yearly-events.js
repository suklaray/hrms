import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(403).json({ message: "Invalid token" });
    }

    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Get birthdays from employees table using dob
    const birthdays = await prisma.employees.findMany({
      where: {
        dob: { not: null }
      },
      select: {
        empid: true,
        name: true,
        dob: true
      }
    });


    // Get approved leaves for the year
    const approvedLeaves = await prisma.leave_requests.findMany({
      where: {
        status: "Approved",
        OR: [
          {
            AND: [
              { from_date: { gte: new Date(targetYear, 0, 1) } },
              { from_date: { lt: new Date(targetYear + 1, 0, 1) } }
            ]
          },
          {
            AND: [
              { to_date: { gte: new Date(targetYear, 0, 1) } },
              { to_date: { lt: new Date(targetYear + 1, 0, 1) } }
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

    const yearEvents = {};

    // Process birthdays
    birthdays.forEach(employee => {
      if (employee.dob) {
        const dob = new Date(employee.dob);
        // Use target year with DOB month and day
        const birthdayThisYear = new Date(targetYear, dob.getMonth(), dob.getDate());
        const month = birthdayThisYear.getMonth() + 1;
        
        if (!yearEvents[month]) yearEvents[month] = [];
        yearEvents[month].push({
          id: `birthday-${employee.empid}`,
          type: "birthday",
          date: birthdayThisYear.toISOString().split('T')[0],
          employee: employee.name,
          title: `${employee.name}'s Birthday`,
          color: "#f59e0b"
        });
      }
    });



    // Process approved leaves
    approvedLeaves.forEach(leave => {
      const fromDate = new Date(leave.from_date);
      const toDate = new Date(leave.to_date);
      
      const currentDate = new Date(fromDate);
      while (currentDate <= toDate) {
        if (currentDate.getFullYear() === targetYear) {
          const month = currentDate.getMonth() + 1;
          if (!yearEvents[month]) yearEvents[month] = [];
          
          yearEvents[month].push({
            id: `leave-${leave.empid}-${currentDate.toISOString().split('T')[0]}`,
            type: "leave",
            date: currentDate.toISOString().split('T')[0],
            employee: leave.name,
            leave_type: leave.leave_type,
            reason: leave.reason,
            title: `${leave.name} - ${leave.leave_type}`,
            color: "#ef4444"
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // fallback datas for holidays
    const holidays = [
      { date: `${targetYear}-01-01`, name: "New Year's Day" },
      { date: `${targetYear}-01-26`, name: "Republic Day" },
      { date: `${targetYear}-08-15`, name: "Independence Day" },
      { date: `${targetYear}-10-02`, name: "Gandhi Jayanti" },
      { date: `${targetYear}-12-25`, name: "Christmas Day" }
    ];

    holidays.forEach(holiday => {
      const holidayDate = new Date(holiday.date);
      const month = holidayDate.getMonth() + 1;
      
      if (!yearEvents[month]) yearEvents[month] = [];
      yearEvents[month].push({
        id: `holiday-${holiday.date}`,
        type: "holiday",
        date: holiday.date,
        name: holiday.name,
        title: `${holiday.name}`,
        color: "#10b981"
      });
    });

    res.status(200).json({
      success: true,
      events: yearEvents,
      year: targetYear
    });

  } catch (error) {
    console.error("Yearly calendar events API error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: error.message 
    });
  }
}
