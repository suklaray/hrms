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
    const canManage = await checkPermission(decoded, PERMISSION_KEYS.CALENDAR_MANAGE);
    if (!canManage) {
      return NextResponse.json({ message: "Forbidden: insufficient permissions" }, { status: 403 });
    }

    const { title, description, event_date, event_type, visible_to, selected_groups } =
      (await getRequestBody(req)) || {};

    if (!title || !event_date || !event_type) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const creatorEmail = decoded.email;
    if (!creatorEmail) {
      return NextResponse.json({ message: "Creator email missing in token" }, { status: 400 });
    }

    let finalVisibleTo: string[] = [];

    // Handle "all" selection
    if (visible_to && visible_to.includes("all")) {
      finalVisibleTo = ["all"];
    } else {
      // Process individual employee selections
      if (visible_to && Array.isArray(visible_to)) {
        finalVisibleTo = [...visible_to.filter((email: string) => email !== "all")];
      }

      // Process group selections
      if (selected_groups && Array.isArray(selected_groups)) {
        for (const group of selected_groups) {
          const [groupType, groupValue] = group.key.split(":");

          let whereClause: any = { status: { not: "Inactive" } };

          if (groupType === "role") {
            whereClause.role = groupValue;
          } else if (groupType === "position") {
            whereClause.position = groupValue;
          } else if (groupType === "employee_type") {
            whereClause.employee_type = groupValue;
          }

          const groupEmployees = await prisma.users.findMany({
            where: whereClause,
            select: { email: true },
          });

          const groupEmails = groupEmployees.map((emp) => emp.email);
          finalVisibleTo = [...finalVisibleTo, ...groupEmails];
        }
      }

      // Remove duplicates and add creator
      finalVisibleTo = [...new Set(finalVisibleTo)];
      if (!finalVisibleTo.includes(creatorEmail)) {
        finalVisibleTo.push(creatorEmail);
      }
    }

    const event = await prisma.calendar_events.create({
      data: {
        title,
        description: description || null,
        event_date: new Date(event_date),
        event_type,
        visible_to: finalVisibleTo.join(","),
        created_by: creatorEmail,
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