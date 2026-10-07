import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from "@/lib/auth";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const user = await verifyEmployeeToken(req);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!(await checkPermission(user, PERMISSION_KEYS.LEAVE_VIEW_OWN))) {
    return NextResponse.json({ message: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const requests = await prisma.leave_requests.findMany({
      where: { empid: user.empid },
      orderBy: { applied_at: "desc" },
      select: {
        from_date: true,
        to_date: true,
        reason: true,
        status: true,
      },
    });

    const leaveStatus = requests.map((request) => ({
      date: `${request.from_date} to ${request.to_date}`,
      reason: request.reason,
      status: request.status,
    }));

    return NextResponse.json({ leaveStatus }, { status: 200 });
  } catch (err) {
    console.error("Error fetching employee leave status:", err);
    return NextResponse.json({ error: "Failed to fetch leave status" }, { status: 500 });
  }
}
