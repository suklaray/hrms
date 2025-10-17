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

    // Get calendar events for the year
    const calendarEvents = await prisma.calendar_events.findMany({
      where: {
        event_date: {
          gte: new Date(targetYear, 0, 1),
          lt: new Date(targetYear + 1, 0, 1)
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        event_date: true,
        event_type: true
      }
    });

    const yearEvents = {};

// Helper: format date as YYYY-MM-DD in local time
const formatDateLocal = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

// Process birthdays
birthdays.forEach(employee => {
  if (employee.dob) {
    const dob = new Date(employee.dob);
    const birthdayThisYear = new Date(targetYear, dob.getMonth(), dob.getDate());
    const month = birthdayThisYear.getMonth() + 1;
    
    if (!yearEvents[month]) yearEvents[month] = [];
    yearEvents[month].push({
      id: `birthday-${employee.empid}`,
      type: "birthday",
      date: formatDateLocal(birthdayThisYear),  
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
        id: `leave-${leave.empid}-${formatDateLocal(currentDate)}`,
        type: "leave",
        date: formatDateLocal(currentDate),  
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


    // Process calendar events
    calendarEvents.forEach(event => {
      const eventDate = new Date(event.event_date);
      const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
      const month = eventDate.getMonth() + 1;
      
      if (!yearEvents[month]) yearEvents[month] = [];
      
      const eventType = event.event_type === 'holiday' ? 'holiday' : 'event';
      const color = event.event_type === 'holiday' ? '#10b981' : '#8b5cf6';
      
      yearEvents[month].push({
        id: `calendar-${event.id}`,
        type: eventType,
        date: dateStr,
        title: event.title,
        description: event.description,
        event_type: event.event_type,
        color: color
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
