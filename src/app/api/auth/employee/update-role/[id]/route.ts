import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
// /pages/api/auth/employee/update-role/[id].js
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import { isSuperAdmin, getAssignableRolesForUser, checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function PUT(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  const { id } = (await context?.params) ?? {};

  let decoded: any;
  try {
    // Check authentication
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: "Access denied" }, { status: 401 });
    }

    decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.EMPLOYEE_EDIT);
    if (!hasAccess) {
      return NextResponse.json({ message: "Access denied: insufficient permissions" }, { status: 403 });
    }
  } catch (authError) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  const { role, roleId } = body;

  try {
    const assignableRoles = await getAssignableRolesForUser(decoded);
    const assignableIds = new Set(assignableRoles.map((r) => r.id));

    const updateData: Partial<Prisma.usersUncheckedUpdateInput> = {};
    if (roleId !== undefined && roleId !== null) {
      const parsedRoleId = parseInt(roleId, 10);
      if (!isNaN(parsedRoleId)) {
        if (!isSuperAdmin(decoded) && !assignableIds.has(parsedRoleId)) {
          return NextResponse.json({ message: "Forbidden: You can only assign lower roles under your hierarchy." }, { status: 403 });
        }
        updateData.roleId = parsedRoleId;

        // Sync legacy enum dynamically based on role name
        const roleRecord = await prisma.role.findUnique({
          where: { id: parsedRoleId },
          select: { name: true }
        });
        if (roleRecord) {
          const lowerName = roleRecord.name.toLowerCase().replace(/\s+/g, '');
          const knownEnums: Record<string, any> = {
            superadmin: "superadmin",
            admin: "admin",
            hr: "hr",
            ceo: "ceo",
            employee: "employee"
          };
          updateData.role = knownEnums[lowerName] || "employee";
        }
      }
    } else if (role && typeof role === 'string') {
      const lower = role.toLowerCase().replace(/\s+/g, '');
      const knownEnums: Record<string, any> = {
        superadmin: "superadmin",
        admin: "admin",
        hr: "hr",
        ceo: "ceo",
        employee: "employee"
      };
      if (knownEnums[lower]) {
        updateData.role = knownEnums[lower];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "Invalid or missing role or roleId" }, { status: 400 });
    }

    const updatedUser = await prisma.users.update({
      where: { empid: id },
      data: updateData,
      include: {
        rbacRole: true,
      },
    });

    return NextResponse.json({ message: "Role updated successfully", updatedUser }, { status: 200 });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json({ message: "Internal server error", error: (error as Error).message }, { status: 500 });
  }
}


