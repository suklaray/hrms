import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { checkPermission } from "@/lib/rbac";
import { getEmployeeDirectoryRoleScope } from "@/lib/roleBasedAccess";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import type { DecodedToken } from "@/lib/jwtTypes";
import { checkAuth } from "@/lib/apiAuth";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  try {
    // Get user from token
    const cookies = cookie.parse(req.headers.get('cookie') || '');
    const { token } = cookies;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;

    const auth = await checkAuth(req, [
      PERMISSION_KEYS.EMPLOYEE_VIEW,
      PERMISSION_KEYS.PAYSLIP_GENERATE,
      PERMISSION_KEYS.PAYSLIP_INITIATE,
      PERMISSION_KEYS.PAYSLIP_DISBURSED,
      PERMISSION_KEYS.JD_CREATE
    ]);
    if ("error" in auth) return auth.error;


    const roleScope = await getEmployeeDirectoryRoleScope(decoded);
    const loggedInUser = roleScope.currentUser;

    if (!loggedInUser) {
      return NextResponse.json({
        success: false,
        message: "User not found",
      }, { status: 404 });
    }

    if (roleScope.visibleRoleIds.length === 0) {
      return NextResponse.json({
        success: true,
        users: [],
        roles: [],
        total: 0,
      }, { status: 200 });
    }

    // Only roles the user is allowed to see
    const visibleRoles = roleScope.roles.filter((role) =>
      roleScope.visibleRoleIds.includes(role.id)
    );
    const { role } = query;
    const filters: Record<string, any> = {
      roleId: {
        in: roleScope.visibleRoleIds,
      },
    };
    if (
      role &&
      typeof role === "string" &&
      role !== "All"
    ) {
      const selectedRole = visibleRoles.find(
        (item) =>
          item.name.toLowerCase() === role.toLowerCase()
      );

      // If selected role does not belong to user's hierarchy,
      // return no users.
      if (!selectedRole) {
        return NextResponse.json({
          success: true,
          users: [],
          roles: [],
          total: 0,
        }, { status: 200 });
      }

      (filters as any).roleId = selectedRole.id;
    }
    const users = await prisma.users.findMany({
      where: filters,

      select: {
        id: true,
        empid: true,
        name: true,
        email: true,
        contact_number: true,
        position: true,
        experience: true,
        employee_type: true,
        date_of_joining: true,
        status: true,
        is_active: true,
        roleId: true,

        // Role table relation
        rbacRole: {
          select: {
            id: true,
            name: true,
            parentId: true,
          },
        },
      },

      orderBy: {
        name: "asc",
      },
    });

    const roleCounts = {};

    visibleRoles.forEach((roleItem) => {
      roleCounts[roleItem.id] = 0;
    });

    users.forEach((user) => {
      if (
        user.roleId &&
        roleCounts[user.roleId] !== undefined
      ) {
        roleCounts[user.roleId]++;
      }
    });
    const rolesWithCounts = visibleRoles.map((roleItem) => ({
      id: roleItem.id,
      name: roleItem.name,
      description: roleItem.description,
      parentId: roleItem.parentId,
      count: roleCounts[roleItem.id] || 0,
    }));
    return NextResponse.json({
      success: true,
      // Only employees from user's hierarchy
      users,
      // Only roles from user's hierarchy
      roles: rolesWithCounts,

      total: users.length,
    }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch users:", error);

    return NextResponse.json({
      success: false,
      error: "Internal Server Error",
    }, { status: 500 });
  }
}
