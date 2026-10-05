// src/lib/rbac.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  isSuperAdmin as rbacIsSuperAdmin,
  isDeveloper as rbacIsDeveloper,
  isSystemRole as rbacIsSystemRole,
  getUserPermissions as rbacGetUserPermissions,
  getRolePermissions as rbacGetRolePermissions,
  hasPermission as rbacHasPermission,
  hasAnyPermission as rbacHasAnyPermission,
  hasAllPermissions as rbacHasAllPermissions,
  requirePermission as rbacRequirePermission,
  requireAnyPermission as rbacRequireAnyPermission,
  requireAllPermissions as rbacRequireAllPermissions,
  requireSystemRole as rbacRequireSystemRole,
  getAllActivePermissionKeys,
} from "@/rbac/service";
import { RoleType, RoleStatus, type UserAuthContext } from "@/rbac/types";

// Re-export central authorization service functions
export {
  rbacIsSuperAdmin as isSuperAdmin,
  rbacIsDeveloper as isDeveloper,
  rbacIsSystemRole as isSystemRole,
  rbacGetRolePermissions as getRolePermissions,
  rbacRequirePermission as requirePermission,
  rbacRequireAnyPermission as requireAnyPermission,
  rbacRequireAllPermissions as requireAllPermissions,
  rbacRequireSystemRole as requireSystemRole,
};

/**
 * Load all permission keys for a user's role from DB dynamically.
 * Preserves backwards compatibility for existing callers.
 */
export async function getUserPermissions(
  userOrRoleId: any,
  legacyRole: string | null = null
): Promise<Set<string>> {
  if (!userOrRoleId) return new Set();

  // If user object passed
  if (typeof userOrRoleId === "object" && userOrRoleId !== null) {
    return rbacGetUserPermissions(userOrRoleId);
  }

  // If numeric roleId passed
  if (typeof userOrRoleId === "number") {
    // Check if it's a role ID or user ID
    const role = await prisma.role.findUnique({
      where: { id: userOrRoleId },
      select: { id: true, type: true, name: true },
    });

    if (role) {
      if (role.type === RoleType.SUPER_ADMIN || ["super admin", "superadmin"].includes(role.name.toLowerCase())) {
        return getAllActivePermissionKeys();
      }
      return rbacGetRolePermissions(role.id);
    }

    // Try finding by user ID
    const user = await prisma.users.findUnique({
      where: { id: userOrRoleId },
      select: { id: true, role: true, roleId: true, rbacRole: true },
    });
    if (user) {
      return rbacGetUserPermissions(user);
    }
  }

  // If string passed (empid or role string)
  if (typeof userOrRoleId === "string") {
    const user = await prisma.users.findFirst({
      where: { empid: userOrRoleId },
      select: { id: true, role: true, roleId: true, rbacRole: true },
    });
    if (user) {
      return rbacGetUserPermissions(user);
    }

    if (legacyRole) {
      const roleRecord = await prisma.role.findFirst({
        where: { name: legacyRole },
        select: { id: true, type: true, name: true },
      });
      if (roleRecord) {
        if (roleRecord.type === RoleType.SUPER_ADMIN) {
          return getAllActivePermissionKeys();
        }
        return rbacGetRolePermissions(roleRecord.id);
      }
    }
  }

  return new Set();
}

/**
 * Unified permission checking function.
 * Checks whether the user has the requested permission.
 * - Super Admin always has full access (all active permissions).
 * - Preloaded permissions Set/array is checked immediately when provided.
 */
export async function checkPermission(
  user: any,
  permissionKey: string,
  preloadedPermissions?: Set<string> | string[]
): Promise<boolean> {
  return rbacHasPermission(user, permissionKey, preloadedPermissions);
}

/**
 * Checks whether a user has at least one permission from the provided list.
 */
export async function checkAnyPermission(
  user: any,
  permissionKeys: string[],
  preloadedPermissions?: Set<string> | string[]
): Promise<boolean> {
  return rbacHasAnyPermission(user, permissionKeys, preloadedPermissions);
}

/**
 * Checks whether a user has all permissions from the provided list.
 */
export async function checkAllPermissions(
  user: any,
  permissionKeys: string[],
  preloadedPermissions?: Set<string> | string[]
): Promise<boolean> {
  return rbacHasAllPermissions(user, permissionKeys, preloadedPermissions);
}

// Unified alias: hasPermission and checkPermission are interchangeable
export const hasPermission = checkPermission;

/**
 * Wraps an API handler with permission checking.
 */
export function withPermission(requiredPermission: string, handler: any) {
  return async (req: any, resOrContext?: any) => {
    const isAppRouter =
      req instanceof Request || (req && req.nextUrl) || (!resOrContext || typeof resOrContext.status !== "function");
    const user = req.user;

    if (!user) {
      return isAppRouter
        ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        : resOrContext.status(401).json({ error: "Unauthorized" });
    }

    const permissions = await getUserPermissions(user);
    if (!rbacIsSuperAdmin(user) && !permissions.has(requiredPermission)) {
      return isAppRouter
        ? NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 })
        : resOrContext.status(403).json({ error: "Forbidden: insufficient permissions" });
    }

    req.permissions = permissions;
    return handler(req, resOrContext);
  };
}

/**
 * Returns array of roles that `user` can search, view, or assign.
 * PRESERVED: Role hierarchy traversal logic remains untouched.
 */
export async function getAssignableRolesForUser(user: any) {
  if (!user) return [];

  const allRoles = await prisma.role.findMany({
    where: { status: RoleStatus.ACTIVE },
    orderBy: { name: "asc" },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });

  if (rbacIsSuperAdmin(user)) {
    return allRoles;
  }

  let userRole: any = null;
  const userId = user.empid || user.id;
  if (userId) {
    try {
      const dbUser = await prisma.users.findUnique({
        where: typeof userId === "number" ? { id: userId } : { empid: String(userId) },
        select: { roleId: true, role: true, rbacRole: true },
      });
      if (dbUser?.rbacRole) {
        userRole = dbUser.rbacRole;
      }
    } catch (e) {
      console.error("Error fetching dbUser role in getAssignableRolesForUser:", e);
    }
  }

  if (!userRole && user.roleId) {
    userRole = allRoles.find((r) => r.id === user.roleId);
  }

  if (!userRole && user.role) {
    userRole = allRoles.find(
      (r) => r.name.toLowerCase() === String(user.role).toLowerCase()
    );
  }

  if (!userRole || userRole.parentId === null || userRole.parentId === undefined) {
    return [];
  }

  const getDescendantRoleIds = (parentId: number, rolesList: any[]): number[] => {
    const directChildren = rolesList.filter((r) => r.parentId === parentId);
    let ids: number[] = [];
    for (const child of directChildren) {
      ids.push(child.id);
      ids = ids.concat(getDescendantRoleIds(child.id, rolesList));
    }
    return ids;
  };

  const descendantIds = new Set(getDescendantRoleIds(userRole.id, allRoles));
  return allRoles.filter((r) => descendantIds.has(r.id));
}

/**
 * Ensures a 'Super Admin' role exists as a protected system role.
 * Super Admin implicitly has all active permissions without requiring individual role_permission rows.
 */
export async function ensureSuperAdminRole(prismaClient: any = prisma) {
  try {
    let superAdminRole = await prismaClient.role.findFirst({
      where: {
        OR: [
          { type: RoleType.SUPER_ADMIN },
          { name: { in: ["Super Admin", "SuperAdmin", "super admin", "superadmin"] } },
        ],
      },
    });

    if (!superAdminRole) {
      superAdminRole = await prismaClient.role.create({
        data: {
          name: "Super Admin",
          description: "Super Admin system role with implicit full permissions",
          type: RoleType.SUPER_ADMIN,
          status: RoleStatus.ACTIVE,
        },
      });
    } else if (superAdminRole.type !== RoleType.SUPER_ADMIN || superAdminRole.status !== RoleStatus.ACTIVE) {
      superAdminRole = await prismaClient.role.update({
        where: { id: superAdminRole.id },
        data: {
          type: RoleType.SUPER_ADMIN,
          status: RoleStatus.ACTIVE,
        },
      });
    }

    return superAdminRole;
  } catch (error) {
    console.error("Error in ensureSuperAdminRole:", error);
    throw error;
  }
}
