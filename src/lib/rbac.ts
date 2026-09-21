// src/lib/rbac.ts
import prisma from "@/lib/prisma";
import { AuthUser, DecodedToken } from "@/types";

const SUPER_ADMIN_ROLE = "Super Admin";

/**
 * Checks if a user is Super Admin.
 */
export function isSuperAdmin(user?: any): boolean {
  if (!user) return false;
  return (
    user?.rbacRole?.name === SUPER_ADMIN_ROLE ||
    user?.rbacRole?.name?.toLowerCase() === "superadmin" ||
    user?.role === "superadmin" ||
    user?.role?.toLowerCase() === "superadmin"
  );
}

/**
 * Load all permission keys for a user's role from DB dynamically.
 */
export async function getUserPermissions(
  userOrRoleId: any,
  legacyRole: string | null = null
): Promise<Set<string>> {
  let roleId: number | null = null;
  let role: string | null = legacyRole;
  let userId: any = null;

  if (typeof userOrRoleId === "object" && userOrRoleId !== null) {
    roleId = userOrRoleId.roleId ?? null;
    role = userOrRoleId.role ?? legacyRole;
    userId = userOrRoleId.empid || userOrRoleId.id || null;
  } else if (typeof userOrRoleId === "number") {
    userId = userOrRoleId;
  } else if (typeof userOrRoleId === "string") {
    // If it could be a roleId number
    if (/^\d+$/.test(userOrRoleId)) {
      roleId = parseInt(userOrRoleId, 10);
      userId = parseInt(userOrRoleId, 10);
    } else {
      userId = userOrRoleId;
    }
  }

  let userRbacRoleName: string | null = null;
  if (userId) {
    try {
      const isNum = typeof userId === "number";
      const dbUser = await prisma.users.findFirst({
        where: isNum
          ? { OR: [{ id: userId }, { empid: String(userId) }] }
          : { empid: String(userId) },
        select: {
          id: true,
          empid: true,
          roleId: true,
          role: true,
          rbacRole: { select: { id: true, name: true } },
        },
      });
      if (dbUser) {
        roleId = dbUser.roleId ?? roleId;
        role = dbUser.role ?? role;
        userRbacRoleName = dbUser.rbacRole?.name ?? null;
      }
    } catch (error) {
      console.error("Error fetching user role in getUserPermissions:", error);
    }
  }

  // Check Super Admin status
  if (
    userRbacRoleName === SUPER_ADMIN_ROLE ||
    userRbacRoleName?.toLowerCase() === "superadmin" ||
    role?.toLowerCase() === "superadmin"
  ) {
    try {
      const allDbPerms = await prisma.permission.findMany({ select: { key: true } });
      return new Set(allDbPerms.map((p) => p.key));
    } catch (error) {
      console.error("Error fetching all permissions for superadmin:", error);
      return new Set();
    }
  }

  // If roleId not determined yet, try matching role name against DB roles
  if (!roleId && role) {
    try {
      const roleRecord = await prisma.role.findFirst({
        where: { name: { equals: role } },
        select: { id: true, name: true },
      });
      if (roleRecord) {
        roleId = roleRecord.id;
        if (!userRbacRoleName) userRbacRoleName = roleRecord.name;
      }
    } catch (err) {
      console.error("Error matching role by name:", err);
    }
  }

  // Check DB permissions for assigned roleId
  if (roleId) {
    try {
      const roleRecord = await prisma.role.findUnique({
        where: { id: roleId },
        select: { name: true },
      });
      if (
        roleRecord &&
        (roleRecord.name === SUPER_ADMIN_ROLE || roleRecord.name.toLowerCase() === "superadmin")
      ) {
        const allDbPerms = await prisma.permission.findMany({ select: { key: true } });
        return new Set(allDbPerms.map((p) => p.key));
      }

      const rolePerms = await prisma.rolePermission.findMany({
        where: { roleId },
        select: { permission: { select: { key: true } } },
      });
      return new Set(rolePerms.map((rp) => rp.permission.key));
    } catch (error) {
      console.error("Error loading role permissions for roleId", roleId, error);
    }
  }

  return new Set();
}

import { NextResponse } from "next/server";

/**
 * Wraps an API handler with permission checking.
 */
export function withPermission(requiredPermission: string, handler: any) {
  return async (req: any, resOrContext?: any) => {
    const isAppRouter = req instanceof Request || (req && req.nextUrl) || (!resOrContext || typeof resOrContext.status !== 'function');

    if (isAppRouter) {
      const user = req.user;
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      if (isSuperAdmin(user)) return handler(req, resOrContext);

      const permissions = await getUserPermissions(user);
      if (!permissions.has(requiredPermission)) {
        return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
      }

      req.permissions = permissions;
      return handler(req, resOrContext);
    }

    const res = resOrContext;
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    if (isSuperAdmin(user)) return handler(req, res);

    const permissions = await getUserPermissions(user);
    if (!permissions.has(requiredPermission)) {
      return res.status(403).json({ error: "Forbidden: insufficient permissions" });
    }

    req.permissions = permissions;
    return handler(req, res);
  };
}

/**
 * Unified permission checking function.
 * Checks whether the user has the requested permission.
 * - Super Admin always has full access (all permissions).
 * - If a preloaded permissions Set or array is provided, checks against it immediately.
 * - Otherwise, dynamically queries the database (roles, permissions, role_permissions) via getUserPermissions(user).
 */
export async function checkPermission(
  user: any,
  permissionKey: string,
  preloadedPermissions?: Set<string> | string[]
): Promise<boolean> {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  if (preloadedPermissions) {
    const permSet = preloadedPermissions instanceof Set ? preloadedPermissions : new Set(preloadedPermissions);
    return permSet.has(permissionKey);
  }

  const permissions = await getUserPermissions(user);
  return permissions.has(permissionKey);
}

// Unified alias: hasPermission and checkPermission are the same single function
export const hasPermission = checkPermission;

/**
 * Returns array of roles that `user` can search, view, or assign.
 */
export async function getAssignableRolesForUser(user: any) {
  if (!user) return [];

  const allRoles = await prisma.role.findMany({
    where: { status: 'active' },
    orderBy: { name: 'asc' },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });

  if (isSuperAdmin(user)) {
    return allRoles;
  }

  let userRole: any = null;
  const userId = user.empid || user.id;
  if (userId) {
    try {
      const dbUser = await prisma.users.findUnique({
        where: typeof userId === 'number' ? { id: userId } : { empid: String(userId) },
        select: { roleId: true, role: true, rbacRole: true },
      });
      if (dbUser?.rbacRole) {
        userRole = dbUser.rbacRole;
      }
    } catch (e) {
      console.error('Error fetching dbUser role in getAssignableRolesForUser:', e);
    }
  }

  if (!userRole && user.roleId) {
    userRole = allRoles.find((r) => r.id === user.roleId);
  }

  if (!userRole && user.role) {
    userRole = allRoles.find(
      (r) => r.name.toLowerCase() === user.role.toLowerCase()
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
 * Ensures a 'Super Admin' role exists in the `roles` table.
 */
export async function ensureSuperAdminRole(prismaClient: any = prisma) {
  try {
    const allDbPermissions = await prismaClient.permission.findMany({
      select: { id: true },
    });

    const totalRoles = await prismaClient.role.count();
    let superAdminRole = await prismaClient.role.findFirst({
      where: {
        name: {
          equals: 'Super Admin',
        },
      },
    });

    if (totalRoles === 0 || !superAdminRole) {
      superAdminRole = await prismaClient.role.create({
        data: {
          name: 'Super Admin',
          description: 'Super Admin role with full system permissions',
          status: 'active',
          permissions: {
            create: allDbPermissions.map((p: any) => ({
              permissionId: p.id,
            })),
          },
        },
      });
    } else if (allDbPermissions.length > 0) {
      const existingRolePerms = await prismaClient.rolePermission.findMany({
        where: { roleId: superAdminRole.id },
        select: { permissionId: true },
      });
      const existingPermIds = new Set(existingRolePerms.map((rp: any) => rp.permissionId));
      const missingPermIds = allDbPermissions.filter((p: any) => !existingPermIds.has(p.id));

      if (missingPermIds.length > 0) {
        await prismaClient.rolePermission.createMany({
          data: missingPermIds.map((p: any) => ({
            roleId: superAdminRole.id,
            permissionId: p.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    return superAdminRole;
  } catch (error) {
    console.error('Error in ensureSuperAdminRole:', error);
    throw error;
  }
}
