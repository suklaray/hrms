import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { checkPermission, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { getQueryParams } from "@/lib/routeHelper";

export async function DELETE(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user: decoded, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;
  if (!decoded) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const canManage = await checkPermission(decoded, PERMISSION_KEYS.CALENDAR_MANAGE);
    if (!canManage) {
      return NextResponse.json({ message: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { id } = await getQueryParams(req, context?.params);
    if (!id) {
      return NextResponse.json({ success: false, message: "Missing event ID" }, { status: 400 });
    }

    const numericId = Number(id);
    const existingEvent = await prisma.calendar_events.findUnique({
      where: { id: numericId },
    });

    if (!existingEvent) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    // Only superadmin or event creator can delete
    if (!isSuperAdmin(decoded) && existingEvent.created_by !== decoded.email) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not allowed to delete this event",
        },
        { status: 403 }
      );
    }

    await prisma.calendar_events.delete({
      where: { id: numericId },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Event deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete event error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}