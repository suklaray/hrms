import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { checkPermission, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { getRequestBody } from "@/lib/routeHelper";

export async function PUT(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user: decoded, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;
  if (!decoded) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const canManage = await checkPermission(decoded, PERMISSION_KEYS.CALENDAR_MANAGE);
    if (!canManage) {
      return NextResponse.json({ message: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { id, title, description, event_date, event_type, visible_to } =
      (await getRequestBody(req)) || {};

    if (!id) {
      return NextResponse.json({ success: false, message: "Missing event ID" }, { status: 400 });
    }

    const existingEvent = await prisma.calendar_events.findUnique({
      where: { id: Number(id) },
    });

    if (!existingEvent) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
    }

    if (!isSuperAdmin(decoded) && existingEvent.created_by !== decoded.email) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not allowed to edit this event",
        },
        { status: 403 }
      );
    }

    const newVisibleTo = visible_to
      ? visible_to.split(",").map((e: string) => e.trim()).filter((e: string) => e)
      : [];

    const updatedVisibleTo = newVisibleTo.includes("all")
      ? "all"
      : Array.from(new Set([...newVisibleTo, decoded.email])).join(",");

    const updatedEvent = await prisma.calendar_events.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        event_date: new Date(event_date),
        event_type,
        visible_to: updatedVisibleTo,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Event updated successfully",
        event: updatedEvent,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update event error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}