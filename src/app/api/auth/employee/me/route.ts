import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user: decoded, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const canAccess = await checkPermission(decoded, PERMISSION_KEYS.ATTENDANCE_MY);
    if (!canAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch basic employee details from `users` table
    const user = await prisma.users.findUnique({
      where: { id: Number(decoded.id) },
      select: {
        empid: true,
        name: true,
        email: true,
        role: true,
        position: true,
        profile_photo: true,
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Check if employee has checked in today but not checked out
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: {
        empid: user.empid,
        date: { gte: today },
        check_out: null,
      },
      orderBy: { check_in: "desc" },
    });

    const isWorking = !!(attendance?.check_in);
    const workStartTime = attendance?.check_in || null;

    // Return user info + attendance status + JWT fields
    return NextResponse.json(
      {
        user: {
          ...user,
          isWorking,
          workStartTime,
          verified: decoded.verified,
          form_submitted: decoded.form_submitted,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Auth error in /me:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
