import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { getEmployeeDirectoryRoleScope } from "@/lib/roleBasedAccess";

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

    const [
      canViewEmployees,
      canViewAttendance,
      canViewLeaves,
      canViewCandidates,
    ] = await Promise.all([
      checkPermission(decoded, PERMISSION_KEYS.EMPLOYEE_VIEW),
      checkPermission(decoded, PERMISSION_KEYS.ATTENDANCE_VIEW),
      checkPermission(decoded, PERMISSION_KEYS.LEAVE_VIEW),
      checkPermission(decoded, PERMISSION_KEYS.RECRUITMENT_VIEW),
    ]);
    const { visibleRoleIds: roleIds } =
      await getEmployeeDirectoryRoleScope(decoded);
    const userWhereClause = {
      is_active: "ACTIVE",
      roleId: { in: roleIds },
    };

    let totalEmployees = 0;
    let activeEmployees = 0;
    let pendingLeaves = 0;
    let todayAttendance = 0;
    let totalCandidates = 0;
    let recentEmployees: any[] = [];
    let currentlyOnline: any[] = [];

    const users = canViewEmployees || canViewAttendance
      ? await prisma.users.findMany({
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
        })
      : [];

    if (canViewEmployees) {
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
    }

    if (canViewAttendance && users.length > 0) {
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          date: { gte: today, lt: tomorrow },
          empid: { in: users.map((user) => user.empid) },
        },
        select: {
          empid: true,
          check_in: true,
          check_out: true,
          attendance_status: true,
        },
        orderBy: [{ empid: "asc" }, { check_in: "asc" }],
      });

      todayAttendance = attendanceRecords.filter(
        (attendance) => attendance.attendance_status === "Present"
      ).length;

      users.forEach((user) => {
        const userAttendance = attendanceRecords.filter(
          (attendance) => attendance.empid === user.empid
        );
        const currentlyLoggedIn = userAttendance.some(
          (attendance) => attendance.check_in && !attendance.check_out
        );

        if (currentlyLoggedIn) {
          const firstCheckIn = userAttendance.find(
            (attendance) => attendance.check_in
          )?.check_in;
          currentlyOnline.push({
            empid: user.empid,
            name: user.name,
            role: user.role,
            position: user.position,
            profile_photo: user.profile_photo,
            check_in: firstCheckIn,
            workingHours: firstCheckIn
              ? Math.round(
                  ((new Date().getTime() - new Date(firstCheckIn).getTime()) /
                    (1000 * 60 * 60)) *
                    10
                ) / 10
              : 0,
          });
        }
      });
      activeEmployees = currentlyOnline.length;
    }

    const [pendingLeaveCount, candidateCount] = await Promise.all([
      canViewLeaves
        ? prisma.leave_requests.count({
            where: {
              status: "Pending",
              users: userWhereClause,
            },
          })
        : Promise.resolve(0),
      canViewCandidates ? prisma.candidates.count() : Promise.resolve(0),
    ]);
    pendingLeaves = pendingLeaveCount;
    totalCandidates = candidateCount;

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
