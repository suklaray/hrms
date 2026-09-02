// lib/rbac.js
// Centralized RBAC helpers. All permission checks go through here.
// Super Admin bypasses all permission checks.

import prisma from "@/lib/prisma";

const SUPER_ADMIN_ROLE = "Super Admin";

// ─── Core helpers ────────────────────────────────────────────────────────────

/**
 * Checks if a user is Super Admin.
 * Returns true if role is 'superadmin' / 'Super Admin', or roleId belongs to Super Admin role in DB.
 */
export function isSuperAdmin(user) {
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
 * Reads users.roleId -> roles table -> role_permissions table -> permissions table.
 * Super Admin gets all permissions in the system.
 * Returns a Set<string> of permission keys. Returns empty Set if no permissions assigned.
 */
export async function getUserPermissions(userOrRoleId, legacyRole = null) {
  let roleId = null;
  let role = legacyRole;
  let userId = null;

  if (typeof userOrRoleId === "object" && userOrRoleId !== null) {
    roleId = userOrRoleId.roleId ?? null;
    role = userOrRoleId.role ?? legacyRole;
    userId = userOrRoleId.empid || userOrRoleId.id || null;
  } else if (typeof userOrRoleId === "number" || (typeof userOrRoleId === "string" && !isNaN(parseInt(userOrRoleId)))) {
    roleId = parseInt(userOrRoleId, 10);
  }

  // Fetch current user details from DB if user ID is available to get fresh roleId & rbacRole
  let userRbacRoleName = null;
  if (userId) {
    try {
      const dbUser = await prisma.users.findUnique({
        where: typeof userId === "number" ? { id: userId } : { empid: String(userId) },
        select: {
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
    } catch (err) {
      const { PERMISSIONS } = await import("@/lib/rbacPermissions");
      return new Set(PERMISSIONS.map((p) => p.key));
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

  // No roleId or no permissions assigned in role_permissions -> empty Set (no static fallbacks)
  return new Set();
}

/**
 * Check if a user has a specific permission.
 * Super Admin always returns true.
 * Pass `permissions` as a Set (from getUserPermissions) to avoid extra DB calls.
 */
export function hasPermission(user, permissionKey, permissions) {
  if (isSuperAdmin(user)) return true;
  if (!permissions) return false;
  return permissions.has(permissionKey);
}

// ─── API middleware ───────────────────────────────────────────────────────────

/**
 * Wraps an API handler with permission checking.
 * Usage:
 *   export default withPermission("employee.create", handler);
 *
 * The handler receives req.user (decoded JWT) and req.permissions (Set).
 */
export function withPermission(requiredPermission, handler) {
  return async (req, res) => {
    const user = req.user; // set by withSessionTimeout
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
 * Check permission inside a handler without wrapping.
 * Returns true/false. Super Admin always true.
 */
export async function checkPermission(user, permissionKey) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const permissions = await getUserPermissions(user);
  return permissions.has(permissionKey);
}

/**
 * Returns array of roles that `user` can search, view, or assign during registration or role update.
 * Rules:
 * 1. Super Admin can select everything from database (all active roles).
 * 2. Non-superadmin user:
 *    - Finds user's role record in database (`Role` table).
 *    - If `userRole` not found or `userRole.parentId` is null/undefined: return `[]` (cannot select any role).
 *    - Otherwise: return all descendant roles (children, grandchildren, etc. via `parentId`) under `userRole`.
 */
export async function getAssignableRolesForUser(user) {
  if (!user) return [];

  const allRoles = await prisma.role.findMany({
    where: { status: 'active' },
    orderBy: { name: 'asc' },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });

  // 1. Super Admin gets all active roles from database
  if (isSuperAdmin(user)) {
    return allRoles;
  }

  // 2. Resolve logged-in user's role record from DB
  let userRole = null;
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

  // If user has no role in DB, or user's role parentId is null -> do not allow selecting any role
  if (!userRole || userRole.parentId === null || userRole.parentId === undefined) {
    return [];
  }

  // 3. Collect all descendant role IDs (children, grandchildren, etc.) where parentId matches recursively
  const getDescendantRoleIds = (parentId, rolesList) => {
    const directChildren = rolesList.filter((r) => r.parentId === parentId);
    let ids = [];
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
 * If no roles exist or no 'Super Admin' role exists, it creates the 'Super Admin' role
 * in the `roles` table and attaches all permissions from the `permissions` table into `role_permissions`.
 */
export async function ensureSuperAdminRole(prismaClient = prisma) {
  try {
    // 1. Get all existing permissions directly from database permissions table
    const allDbPermissions = await prismaClient.permission.findMany({
      select: { id: true },
    });

    // 2. Check roles table
    const totalRoles = await prismaClient.role.count();
    let superAdminRole = await prismaClient.role.findFirst({
      where: {
        name: {
          equals: 'Super Admin',
        },
      },
    });

    // 3. If total roles count is 0 or no 'Super Admin' role exists
    if (totalRoles === 0 || !superAdminRole) {
      superAdminRole = await prismaClient.role.create({
        data: {
          name: 'Super Admin',
          description: 'Super Admin role with full system permissions',
          status: 'active',
          permissions: {
            create: allDbPermissions.map((p) => ({
              permissionId: p.id,
            })),
          },
        },
      });
    } else if (allDbPermissions.length > 0) {
      // If 'Super Admin' role exists, ensure all database permissions are in role_permissions table
      const existingRolePerms = await prismaClient.rolePermission.findMany({
        where: { roleId: superAdminRole.id },
        select: { permissionId: true },
      });
      const existingPermIds = new Set(existingRolePerms.map((rp) => rp.permissionId));
      const missingPermIds = allDbPermissions.filter((p) => !existingPermIds.has(p.id));

      if (missingPermIds.length > 0) {
        await prismaClient.rolePermission.createMany({
          data: missingPermIds.map((p) => ({
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

