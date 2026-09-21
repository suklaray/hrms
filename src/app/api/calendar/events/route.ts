import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { checkPermission, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { getQueryParams } from "@/lib/routeHelper";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user: decoded, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;
  if (!decoded) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const canView = await checkPermission(decoded, PERMISSION_KEYS.CALENDAR_VIEW);
    if (!canView) {
      return NextResponse.json({ message: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { month, year } = await getQueryParams(req, context?.params);
    const targetMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

    // Get birthdays from employees table
    const birthdays = await prisma.employees.findMany({
      where: { dob: { not: null } },
      select: { empid: true, name: true, dob: true },
    });

    let leaveFilter: any = {
      status: "Approved",
      OR: [
        {
          AND: [
            { from_date: { lte: new Date(targetYear, targetMonth, 0) } },
            { to_date: { gte: new Date(targetYear, targetMonth - 1, 1) } },
          ],
        },
      ],
    };

    const canViewAllLeaves = await checkPermission(decoded, PERMISSION_KEYS.ATTENDANCE_VIEW);
    if (!canViewAllLeaves) {
      leaveFilter.empid = decoded.empid;
    }

    const approvedLeaves = await prisma.leave_requests.findMany({
      where: leaveFilter,
      select: {
        empid: true,
        name: true,
        from_date: true,
        to_date: true,
        leave_type: true,
        reason: true,
      },
    });

    const userEmail = decoded.email;
    let visibilityFilter = {};

    if (!isSuperAdmin(decoded)) {
      visibilityFilter = {
        OR: [
          { visible_to: "all" },
          { visible_to: { startsWith: "all," } },
          { visible_to: { contains: userEmail } },
        ],
      };
    }

    const calendarEvents = await prisma.calendar_events.findMany({
      where: {
        event_date: {
          gte: new Date(targetYear, targetMonth - 1, 1),
          lt: new Date(targetYear, targetMonth, 1),
        },
        ...visibilityFilter,
      },
      select: {
        id: true,
        title: true,
        description: true,
        event_date: true,
        event_type: true,
        visible_to: true,
      },
    });

    const events: any[] = [];

    const formatDateLocal = (date: Date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;
    };

    birthdays.forEach((employee) => {
      if (employee.dob) {
        const dob = new Date(employee.dob);
        const birthdayThisYear = new Date(
          targetYear,
          dob.getMonth(),
          dob.getDate()
        );

        if (birthdayThisYear.getMonth() + 1 === targetMonth) {
          events.push({
            id: `birthday-${employee.empid}`,
            type: "birthday",
            date: formatDateLocal(birthdayThisYear),
            employee: employee.name,
            title: `${employee.name}'s Birthday`,
          });
        }
      }
    });

    approvedLeaves.forEach((leave) => {
      const fromDate = new Date(leave.from_date);
      const toDate = new Date(leave.to_date);

      const currentDate = new Date(fromDate);
      while (currentDate <= toDate) {
        if (
          currentDate.getMonth() + 1 === targetMonth &&
          currentDate.getFullYear() === targetYear
        ) {
          events.push({
            id: `leave-${leave.empid}-${formatDateLocal(currentDate)}`,
            type: "leave",
            date: formatDateLocal(currentDate),
            employee: leave.name,
            leave_type: leave.leave_type,
            reason: leave.reason,
            title: `${leave.name} - ${leave.leave_type}`,
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    calendarEvents.forEach((event) => {
      const eventDate = new Date(event.event_date);
      const dateStr = formatDateLocal(eventDate);

      const eventType = event.event_type === "holiday" ? "holiday" : "event";
      const icon = event.event_type === "holiday" ? "🎉" : "📅";

      events.push({
        id: `calendar-${event.id}`,
        type: eventType,
        date: dateStr,
        title: `${icon} ${event.title}`,
        description: event.description,
        event_type: event.event_type,
      });
    });

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json(
      {
        success: true,
        events,
        month: targetMonth,
        year: targetYear,
        total: events.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Calendar events API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
