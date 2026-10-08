import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const view = req.nextUrl.searchParams.get("view");
  const requiredPermission =
    view === "history"
      ? PERMISSION_KEYS.LEAVE_VIEW_HISTORY
      : view === "pending"
        ? PERMISSION_KEYS.LEAVE_VIEW_PENDING
        : null;

  if (!requiredPermission) {
    return NextResponse.json(
      { success: false, message: "Invalid leave details view" },
      { status: 400 }
    );
  }

  const { error } = await checkAuth(req, [requiredPermission]);
  if (error) return error;

  const query = await getQueryParams(req, context?.params);

  const { empid } = query;

  if (!empid) {
    return NextResponse.json({ success: false, message: 'Employee ID is required' }, { status: 400 });
  }

  try {
    // Get employee basic info
    const employee = await prisma.users.findFirst({
      where: { empid: empid },
      select: {
        empid: true,
        name: true,
        email: true,
      }
    });

    if (!employee) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 });
    }

    // Get all leave requests for this employee
    const leaveHistory = await prisma.leave_requests.findMany({
      where: {
        empid: empid,
        ...(view === "pending" ? { status: "Pending" } : {}),
      },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        leave_type: true,
        from_date: true,
        to_date: true,
        reason: true,
        status: true,
        attachment: true,
        resoan_to_reject: true,
        reason_to_cancel: true,
      }
    });

    const employeeData = {
      ...employee,
      leaveHistory: leaveHistory
    };

    return NextResponse.json({ success: true, data: employeeData }, { status: 200 });
  } catch (error) {
    console.error('Error fetching employee leave details:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
