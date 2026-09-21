import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { getPendingRegularization } from "@/lib/checkPendingRegularization";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.ATTENDANCE_REGULARIZE);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    const pendingAttendance = await getPendingRegularization(user.empid);

    if (!pendingAttendance) {
      return NextResponse.json(
        {
          hasMissedCheckout: false,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        hasMissedCheckout: true,
        attendance: {
          id: pendingAttendance.id,
          date: pendingAttendance.date,
          check_in: pendingAttendance.check_in,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Check missed checkout error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
