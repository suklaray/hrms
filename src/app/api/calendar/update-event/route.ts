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
    const [canEdit, canManage] = await Promise.all([
      checkPermission(decoded, PERMISSION_KEYS.CALENDAR_EDIT),
      checkPermission(decoded, PERMISSION_KEYS.CALENDAR_MANAGE),
    ]);
    if (!canEdit && !canManage) {
      return NextResponse.json({ message: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const {
      id,
      title,
      description,
      event_date,
      event_type,
      visibility,
      visible_to,
    } =
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

    const requestedVisibility = visibility ?? visible_to;
    const requestedEmails = Array.isArray(requestedVisibility)
      ? requestedVisibility.filter(
          (email: unknown): email is string => typeof email === "string"
        )
      : typeof requestedVisibility === "string"
        ? requestedVisibility
            .split(",")
            .map((email: string) => email.trim())
            .filter(Boolean)
        : [];
    const visibleToAll = requestedEmails.includes("all");
    const visibleEmployees = await prisma.users.findMany({
      where: visibleToAll
        ? { is_active: "ACTIVE", status: { not: "Inactive" } }
        : {
            email: {
              in: requestedEmails.filter((email) => email !== "all"),
            },
          },
      select: { empid: true },
    });
    const visibleEmployeeIds = new Set(
      visibleEmployees.map((employee) => employee.empid)
    );

    const eventCreator = await prisma.users.findUnique({
      where: { email: existingEvent.created_by },
      select: { empid: true },
    });
    if (eventCreator) visibleEmployeeIds.delete(eventCreator.empid);
    const visibleEmployeeEmails = await prisma.users.findMany({
      where: { empid: { in: [...visibleEmployeeIds] } },
      select: { email: true },
    });
    const legacyVisibility = visibleToAll
      ? "all"
      : [...new Set(visibleEmployeeEmails.map((employee) => employee.email))]
          .join(",");

    const updatedEvent = await prisma.calendar_events.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        event_date: new Date(event_date),
        event_type,
        visible_to:
          requestedVisibility === undefined ? undefined : legacyVisibility,
        visibility:
          requestedVisibility === undefined
            ? undefined
            : {
                deleteMany: {},
                create: [...visibleEmployeeIds].map((empid) => ({ empid })),
              },
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