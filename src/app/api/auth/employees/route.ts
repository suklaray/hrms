import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { checkPermission, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import type { DecodedToken } from "@/lib/jwtTypes";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  

  try {
    // Get user from token
    const cookies = cookie.parse(req.headers.get('cookie') || '');
    const { token } = cookies;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.EMPLOYEE_VIEW);
    if (!hasAccess) {
      return NextResponse.json({
        success: false,
        message: "Forbidden: insufficient permissions",
      }, { status: 403 });
    }

    const loggedInUser = await prisma.users.findUnique({
      where: {
      empid: (decoded.empid || decoded.id) as string,
      },
      select: {
        id: true,
        empid: true,
        roleId: true,

        rbacRole: {
          select: {
            id: true,
            name: true,
            parentId: true,
          },
        },
      },
    });

    if (!loggedInUser) {
      return NextResponse.json({
        success: false,
        message: "User not found",
      }, { status: 404 });
    }

    const currentRoleId = loggedInUser.roleId || loggedInUser.rbacRole?.id;

    if (!currentRoleId) {
      return NextResponse.json({
        success: true,
        users: [],
        roles: [],
        total: 0,
      }, { status: 200 });
    }

    const allRoles = await prisma.role.findMany({
      where: {
        status: "active",
      },
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        status: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    let visibleRoleIds = [];
    if (isSuperAdmin(loggedInUser)) {
      visibleRoleIds = allRoles.map((role) => role.id);
    } else {

      const getDescendantRoleIds = (parentId) => {
        const ids = [];

        const children = allRoles.filter(
          (role) => role.parentId === parentId
        );

        for (const child of children) {
          ids.push(child.id);

          // Recursively get this child's children
          ids.push(...getDescendantRoleIds(child.id));
        }

        return ids;
      };

      visibleRoleIds = getDescendantRoleIds(currentRoleId);
    }

    // Remove duplicate IDs
    const uniqueVisibleRoleIds = [...new Set(visibleRoleIds)];

    // Only roles the user is allowed to see
    const visibleRoles = allRoles.filter((role) =>
      uniqueVisibleRoleIds.includes(role.id)
    );
    const { role } = query;
    const filters: Record<string, any> = {
      status: {
        not: "Inactive",
      },
      roleId: {
        in: uniqueVisibleRoleIds,
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

