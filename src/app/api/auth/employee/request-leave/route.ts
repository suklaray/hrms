import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const authenticatedUser = await verifyEmployeeToken(req);
  if (!authenticatedUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!(await checkPermission(authenticatedUser, PERMISSION_KEYS.LEAVE_REQUEST))) {
    return NextResponse.json({ message: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  const body = (await getRequestBody(req)) || {};

  const { startDate, endDate, reason, leave_type, leaveType } = body;

  if (!startDate || !endDate || !reason) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  try {
    const employee = await prisma.users.findUnique({
      where: { empid: authenticatedUser.empid },
      select: { empid: true, name: true },
    });

    if (!employee) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.leave_requests.create({
      data: {
        empid: employee.empid,
        name: employee.name,
        leave_type: leave_type || leaveType || "Casual Leave",
        from_date: new Date(startDate),
        to_date: new Date(endDate),
        reason,
      },
    });

    return NextResponse.json({ message: "Leave request submitted" }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
