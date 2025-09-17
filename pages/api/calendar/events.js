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

    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Get birthdays from employees table
    const birthdays = await prisma.employees.findMany({
      where: { dob: { not: null } },
      select: { empid: true, name: true, dob: true }
    });

    // Get approved leaves for the month
    const approvedLeaves = await prisma.leave_requests.findMany({
      where: {
        status: "Approved",
        OR: [{
          AND: [
            { from_date: { lte: new Date(targetYear, targetMonth, 0) } },
            { to_date: { gte: new Date(targetYear, targetMonth - 1, 1) } }
          ]
        }]
      },
      select: {
        empid: true, name: true, from_date: true, to_date: true,
        leave_type: true, reason: true
      }
    });

    // Get calendar events for the month
    const calendarEvents = await prisma.calendar_events.findMany({
      where: {
        event_date: {
          gte: new Date(targetYear, targetMonth - 1, 1),
          lt: new Date(targetYear, targetMonth, 1)
        }
      },
      select: {
        id: true, title: true, description: true,
        event_date: true, event_type: true
      }
    });

    const events = [];

    // Process birthdays
    birthdays.forEach(employee => {
      if (employee.dob) {
        const dob = new Date(employee.dob);
        const birthdayThisYear = new Date(targetYear, dob.getMonth(), dob.getDate());
        
        if (birthdayThisYear.getMonth() + 1 === targetMonth) {
          events.push({
            id: `birthday-${employee.empid}`,
            type: "birthday",
            date: birthdayThisYear.toISOString().split('T')[0],
            employee: employee.name,
            title: `🎂 ${employee.name}'s Birthday`
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
            title: `${leave.name} - ${leave.leave_type}`
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    //calendar events processing
    calendarEvents.forEach(event => {
      const eventDate = new Date(event.event_date);
      const dateStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`;
      
      const eventType = event.event_type === 'holiday' ? 'holiday' : 'event';
      const icon = event.event_type === 'holiday' ? '🎉' : '📅';
      
      events.push({
        id: `calendar-${event.id}`,
        type: eventType,
        date: dateStr,
        title: `${icon} ${event.title}`,
        description: event.description,
        event_type: event.event_type
      });
    });
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
