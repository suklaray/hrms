import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user: decoded, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const empid = decoded.empid;

    const canCheckout = await checkPermission(decoded, PERMISSION_KEYS.ATTENDANCE_MY);
    if (!canCheckout) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const checkoutTime = new Date();
    const latestCheckin = await prisma.attendance.findFirst({
      where: { empid, check_out: null },
      orderBy: { check_in: "desc" },
    });

    if (!latestCheckin) {
      return NextResponse.json({ error: "No active check-in found" }, { status: 400 });
    }

    const totalHours = (checkoutTime.getTime() - new Date(latestCheckin.check_in).getTime()) / (1000 * 60 * 60);
    const attendanceStatus = totalHours >= 4 ? "Present" : "Absent";

    await prisma.$transaction([
      prisma.users.update({ where: { empid }, data: { status: "Logged Out" } }),
      prisma.attendance.update({
        where: { id: latestCheckin.id },
        data: { check_out: checkoutTime, total_hours: totalHours, attendance_status: attendanceStatus },
      }),
    ]);

    return NextResponse.json({ message: "Check-out successful" }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: "Check-out failed", details: err.message }, { status: 500 });
  }
}
