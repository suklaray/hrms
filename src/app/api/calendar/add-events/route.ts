import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { getRequestBody } from "@/lib/routeHelper";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user: decoded, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;
  if (!decoded) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const [canCreate, canManage] = await Promise.all([
      checkPermission(decoded, PERMISSION_KEYS.CALENDAR_CREATE),
      checkPermission(decoded, PERMISSION_KEYS.CALENDAR_MANAGE),
    ]);
    if (!canCreate && !canManage) {
      return NextResponse.json({ message: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const {
      title,
      description,
      event_date,
      event_type,
      visibility,
      visible_to,
      selected_groups,
    } =
      (await getRequestBody(req)) || {};

    if (!title || !event_date || !event_type) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const creator = decoded.empid
      ? await prisma.users.findUnique({
          where: { empid: decoded.empid },
          select: { empid: true, email: true },
        })
      : decoded.email
        ? await prisma.users.findUnique({
            where: { email: decoded.email },
            select: { empid: true, email: true },
          })
        : null;
    if (!creator) {
      return NextResponse.json({ message: "Creator account not found" }, { status: 400 });
    }

    const allEmployees = await prisma.users.findMany({
      where: { is_active: "ACTIVE", status: { not: "Inactive" } },
      select: { empid: true, email: true },
    });
    const requestedVisibility = visibility ?? visible_to;
    const visibleEmails = Array.isArray(requestedVisibility)
      ? requestedVisibility.filter(
          (email: unknown): email is string => typeof email === "string"
        )
      : typeof requestedVisibility === "string"
        ? requestedVisibility.split(",").map((email: string) => email.trim())
        : [];
    const visibleToAll = visibleEmails.includes("all");
    const visibleEmployeeIds = new Set(
      visibleToAll
        ? allEmployees.map((employee) => employee.empid)
        : (
            await prisma.users.findMany({
              where: {
                email: { in: visibleEmails.filter((email) => email !== "all") },
                is_active: "ACTIVE",
                status: { not: "Inactive" },
              },
              select: { empid: true },
            })
          ).map((employee) => employee.empid)
    );

    if (Array.isArray(selected_groups)) {
      for (const group of selected_groups) {
        if (typeof group?.key !== "string") continue;
        const [groupType, groupValue] = group.key.split(":");
        if (!groupValue) continue;

        const whereClause: Record<string, unknown> = {
          is_active: "ACTIVE",
          status: { not: "Inactive" },
        };
        if (groupType === "role") whereClause.role = groupValue;
        else if (groupType === "position") whereClause.position = groupValue;
        else if (groupType === "employee_type") whereClause.employee_type = groupValue;
        else continue;

        const groupEmployees = await prisma.users.findMany({
          where: whereClause,
          select: { empid: true },
        });
        groupEmployees.forEach((employee) => visibleEmployeeIds.add(employee.empid));
      }
    }
    visibleEmployeeIds.delete(creator.empid);
    const selectedEmployees = await prisma.users.findMany({
      where: { empid: { in: [...visibleEmployeeIds] } },
      select: { email: true },
    });

    const event = await prisma.calendar_events.create({
      data: {
        title,
        description: description || null,
        event_date: new Date(event_date),
        event_type,
        visible_to: visibleToAll
          ? "all"
          : [...new Set(selectedEmployees.map((employee) => employee.email))]
              .join(","),
        created_by: creator.email,
        visibility: {
          create: [...visibleEmployeeIds].map((empid) => ({ empid })),
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Event added successfully",
        event,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add event API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}