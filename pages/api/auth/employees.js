import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { checkPermission,isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method Not Allowed",
    });
  }

  try {
    // Get user from token
    const cookies = cookie.parse(req.headers.cookie || '');
    const { token } = cookies;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.EMPLOYEE_VIEW);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }
    const loggedInUser = await prisma.users.findUnique({
      where: {
        empid: decoded.empid || decoded.id,
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
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentRoleId =
      loggedInUser.roleId || loggedInUser.rbacRole?.id;

    if (!currentRoleId) {
      return res.status(200).json({
        success: true,
        users: [],
        roles: [],
        total: 0,
      });
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
    const { role } = req.query;
    const filters = {
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
        return res.status(200).json({
          success: true,
          users: [],
          roles: [],
          total: 0,
        });
      }

      filters.roleId = selectedRole.id;
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
    return res.status(200).json({
      success: true,
      // Only employees from user's hierarchy
      users,
      // Only roles from user's hierarchy
      roles: rolesWithCounts,

      total: users.length,
    });
  } catch (error) {
    console.error("Failed to fetch users:", error);

    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
}