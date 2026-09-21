import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { checkPermission, isSuperAdmin, getAssignableRolesForUser } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user: decoded, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.DASHBOARD_VIEW);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Determine accessible users dynamically from DB
    const canViewAll = isSuperAdmin(decoded) || (await checkPermission(decoded, PERMISSION_KEYS.EMPLOYEE_VIEW));
    let userWhereClause: any = { status: { not: "Inactive" } };

    if (!canViewAll) {
      const assignableRoles = await getAssignableRolesForUser(decoded);
      const assignableIds = assignableRoles.map((r: any) => r.id);
      userWhereClause = {
        OR: [
          { roleId: { in: assignableIds }, status: { not: "Inactive" } },
          { empid: (decoded.empid || decoded.id) as string, status: { not: "Inactive" } },
        ],
      };
    }

    let totalEmployees = 0;
    let activeEmployees = 0;
    let pendingLeaves = 0;
    let todayAttendance = 0;
    let totalCandidates = 0;
    let recentEmployees: any[] = [];
    let currentlyOnline: any[] = [];

    try {
      const results = await Promise.allSettled([
        // Query 1: Get users with attendance data
        prisma.users.findMany({
          where: userWhereClause,
          select: {
            empid: true,
            name: true,
            role: true,
            position: true,
            employee_type: true,
            date_of_joining: true,
            profile_photo: true,
            id: true,
          },
          orderBy: { id: "desc" },
        }),

        // Query 2: Get today's attendance
        prisma.attendance.findMany({
          where: {
            date: { gte: today, lt: tomorrow },
          },
          select: {
            empid: true,
            check_in: true,
            check_out: true,
            attendance_status: true,
          },
          orderBy: [{ empid: "asc" }, { check_in: "asc" }],
        }),

        // Query 3: Count pending leaves
        prisma.leave_requests.count({
          where: {
            status: "Pending",
            users: userWhereClause,
          },
        }),

        // Query 4: Count candidates
        prisma.candidates.count(),
      ]);

      const [usersResult, attendanceResult, leavesResult, candidatesResult] = results;

      if (usersResult.status === "fulfilled") {
        const users = usersResult.value;
        totalEmployees = users.length;
        recentEmployees = users.slice(0, 5).map((emp) => ({
          empid: emp.empid,
          name: emp.name,
          role: emp.role,
          position: emp.position,
          type: emp.employee_type,
          createdAt: emp.date_of_joining || new Date(),
          profile_photo: emp.profile_photo,
        }));

        if (attendanceResult.status === "fulfilled") {
          const attendanceRecords = attendanceResult.value;

          todayAttendance = attendanceRecords.filter((a) => a.attendance_status === "Present").length;

          const loggedInUsers: any[] = [];
          users.forEach((u) => {
            const userAttendance = attendanceRecords.filter((a) => a.empid === u.empid);
            const currentlyLoggedIn = userAttendance.some((a) => a.check_in && !a.check_out);

            if (currentlyLoggedIn) {
              const firstCheckIn = userAttendance.find((a) => a.check_in)?.check_in;
              loggedInUsers.push({
                empid: u.empid,
                name: u.name,
                role: u.role,
                position: u.position,
                profile_photo: u.profile_photo,
                check_in: firstCheckIn,
                workingHours: firstCheckIn
                  ? Math.round(
                      ((new Date().getTime() - new Date(firstCheckIn).getTime()) / (1000 * 60 * 60)) * 10
                    ) / 10
                  : 0,
              });
            }
          });

          currentlyOnline = loggedInUsers;
          activeEmployees = currentlyOnline.length;
        }
      }

      if (leavesResult.status === "fulfilled") {
        pendingLeaves = leavesResult.value;
      }

      if (candidatesResult.status === "fulfilled") {
        totalCandidates = candidatesResult.value;
      }
    } catch (error) {
      console.error("Dashboard stats query error:", error);
    }

    const attendancePercentage =
      activeEmployees > 0 ? Math.round((todayAttendance / activeEmployees) * 100) : 0;

    return NextResponse.json(
      {
        totalEmployees,
        activeEmployees,
        pendingLeaves,
        todayAttendance: attendancePercentage,
        totalCandidates,
        currentlyOnline,
        recentEmployees,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
