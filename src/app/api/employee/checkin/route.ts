import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { getPendingRegularization } from "@/lib/checkPendingRegularization";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user: decoded, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const empid = decoded.empid;

    const canCheckin = await checkPermission(decoded, PERMISSION_KEYS.ATTENDANCE_MY);
    if (!canCheckin) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const pendingAttendance = await getPendingRegularization(empid);
    if (pendingAttendance) {
      return NextResponse.json(
        {
          error: "Please submit yesterday's attendance regularization before checking in.",
        },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.users.update({ where: { empid }, data: { status: "Logged In" } }),
      prisma.attendance.create({
        data: { empid, check_in: new Date(), date: new Date(), attendance_status: "Present" },
      }),
    ]);

    return NextResponse.json({ message: "Check-in successful" }, { status: 200 });
  } catch (err: any) {
    console.error("Check-in failed:", err);
    return NextResponse.json({ error: "Check-in failed", details: err.message }, { status: 500 });
  }
}
