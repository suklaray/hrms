// src/rbac/service.ts
import prisma from "@/lib/prisma";
import { RoleType, RoleStatus, type UserAuthContext } from "./types";
import { PERMISSIONS } from "./permissions";

/**
 * Cache for all active permission keys in memory to minimize DB roundtrips.
 * Revalidated with TTL.
 */
let cachedAllActivePermissions: { keys: Set<string>; expiry: number } | null = null;
const ALL_PERMISSIONS_CACHE_TTL_MS = 60 * 1000; // 1 minute

export async function getAllActivePermissionKeys(): Promise<Set<string>> {
  const now = Date.now();
  if (cachedAllActivePermissions && cachedAllActivePermissions.expiry > now) {
    return cachedAllActivePermissions.keys;
  }

  try {
    const permissions = await prisma.permission.findMany({
      where: { isActive: true },
      select: { key: true },
    });
    const keys = new Set(permissions.map((p) => p.key));
    cachedAllActivePermissions = { keys, expiry: now + ALL_PERMISSIONS_CACHE_TTL_MS };
    return keys;
  } catch (error) {
    console.error("Error fetching all active permissions:", error);
    return new Set();
  }
}

/**
 * Invalidate in-memory permission cache (called after RBAC sync or role/permission updates)
 */
export function invalidatePermissionsCache(): void {
  cachedAllActivePermissions = null;
}

/**
 * Resolves whether a user has the SUPER_ADMIN system role.
 * Super Admin has implicit access to all registered active permissions.
 */
export function isSuperAdmin(user?: UserAuthContext | any): boolean {
  if (!user) return false;

  // 1. Direct type on rbacRole object
  if (user.rbacRole?.type === RoleType.SUPER_ADMIN || user.rbacRole?.type === "SUPER_ADMIN") {
    return true;
  }

  // 2. Legacy users_role enum string
  if (user.role && String(user.role).toLowerCase() === "superadmin") {
    return true;
  }

  // 3. Role name fallback
  const roleName = user.rbacRole?.name || (typeof user.role === "string" ? user.role : "");
  if (roleName && ["super admin", "superadmin"].includes(roleName.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Checks if a user is a system role (SUPER_ADMIN)
 */
export function isSystemRole(user?: UserAuthContext | any): boolean {
  return isSuperAdmin(user);
}

export function isDeveloper(_user?: UserAuthContext | any): boolean {
  return false;
}

/**
 * Resolves the role details (ID, name, type) for a given user or user context.
 */
export async function resolveUserRole(userOrId: UserAuthContext | number | string | any): Promise<{
  roleId: number | null;
  roleType: RoleType | string | null;
  roleName: string | null;
} | null> {
  if (!userOrId) return null;

  // Fast path if role details already attached to user object
  if (typeof userOrId === "object" && userOrId !== null) {
    if (isSuperAdmin(userOrId)) {
      return {
        roleId: userOrId.roleId ?? userOrId.rbacRole?.id ?? null,
        roleType: RoleType.SUPER_ADMIN,
        roleName: userOrId.rbacRole?.name || "Super Admin",
      };
    }

    if (userOrId.rbacRole?.type) {
      return {
        roleId: userOrId.rbacRole.id,
        roleType: userOrId.rbacRole.type,
        roleName: userOrId.rbacRole.name,
      };
    }
  }

  // Extract ID or empid to look up in DB
  let userId: number | string | null = null;
  let userEmpid: string | null = null;

  if (typeof userOrId === "object" && userOrId !== null) {
    if (userOrId.id) userId = userOrId.id;
    if (userOrId.empid) userEmpid = userOrId.empid;
  } else if (typeof userOrId === "number") {
    userId = userOrId;
  } else if (typeof userOrId === "string") {
    if (/^\d+$/.test(userOrId)) {
      userId = parseInt(userOrId, 10);
    } else {
      userEmpid = userOrId;
    }
  }

  try {
    const dbUser = await prisma.users.findFirst({
      where: {
        OR: [
          ...(userId ? [{ id: Number(userId) }] : []),
          ...(userEmpid ? [{ empid: String(userEmpid) }] : []),
        ],
      },
      select: {
        id: true,
        role: true,
        roleId: true,
        rbacRole: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (!dbUser) return null;

    if (dbUser.role === "superadmin" || dbUser.rbacRole?.type === "SUPER_ADMIN") {
      return {
        roleId: dbUser.rbacRole?.id ?? dbUser.roleId,
        roleType: RoleType.SUPER_ADMIN,
        roleName: dbUser.rbacRole?.name || "Super Admin",
      };
    }

    if (dbUser.rbacRole) {
      return {
        roleId: dbUser.rbacRole.id,
        roleType: dbUser.rbacRole.type,
        roleName: dbUser.rbacRole.name,
      };
    }

    return null;
  } catch (error) {
    console.error("Error resolving user role:", error);
    return null;
  }
}

/**
 * Loads all permissions assigned to a role.
 */
export async function getRolePermissions(roleId: number): Promise<Set<string>> {
  try {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, type: true, status: true },
    });

    if (!role || role.status !== RoleStatus.ACTIVE) {
      return new Set();
    }

    // Super Admin role implicitly receives all active permissions
    if (role.type === RoleType.SUPER_ADMIN || ["super admin", "superadmin"].includes(role.name.toLowerCase())) {
      return getAllActivePermissionKeys();
    }

    const rolePerms = await prisma.rolePermission.findMany({
      where: {
        roleId,
        permission: {
          isActive: true,
        },
      },
      select: {
        permission: {
          select: { key: true },
        },
      },
    });

    return new Set(rolePerms.map((rp) => rp.permission.key));
  } catch (error) {
    console.error(`Error loading permissions for roleId ${roleId}:`, error);
    return new Set();
  }
}

/**
 * Loads the effective permission Set for a user.
 * 1. Checks request-level preloaded cache on user object if available.
 * 2. If user is Super Admin: returns ALL active permissions implicitly.
 * 3. Otherwise: queries the database for role permissions.
 */
export async function getUserPermissions(
  user: UserAuthContext | any,
  preloadedPermissions?: Set<string> | string[]
): Promise<Set<string>> {
  if (!user) return new Set();

  // 1. Check preloaded permissions
  if (preloadedPermissions) {
    return preloadedPermissions instanceof Set
      ? preloadedPermissions
      : new Set(preloadedPermissions);
  }

  // Check attached request-level cache
  if (user._resolvedPermissions instanceof Set) {
    return user._resolvedPermissions;
  }

  // 2. Super Admin implicit bypass
  if (isSuperAdmin(user)) {
    const allPerms = await getAllActivePermissionKeys();
    user._resolvedPermissions = allPerms;
    return allPerms;
  }

  // 3. Resolve role and fetch permissions
  const roleInfo = await resolveUserRole(user);
  if (!roleInfo || !roleInfo.roleId) {
    return new Set();
  }

  if (roleInfo.roleType === RoleType.SUPER_ADMIN) {
    const allPerms = await getAllActivePermissionKeys();
    user._resolvedPermissions = allPerms;
    return allPerms;
  }

  const permissions = await getRolePermissions(roleInfo.roleId);
  user._resolvedPermissions = permissions;
  return permissions;
}

/**
 * Central Authorization Function: check if user has a specific permission.
 */
export async function hasPermission(
  user: UserAuthContext | any,
  permissionKey: string,
  preloadedPermissions?: Set<string> | string[]
): Promise<boolean> {
  if (!user || !permissionKey) return false;
  if (isSuperAdmin(user)) return true;

  const permissions = await getUserPermissions(user, preloadedPermissions);
  return permissions.has(permissionKey);
}

/**
 * Central Authorization Function: check if user has ANY of the specified permissions.
 */
export async function hasAnyPermission(
  user: UserAuthContext | any,
  permissionKeys: string[],
  preloadedPermissions?: Set<string> | string[]
): Promise<boolean> {
  if (!user || !permissionKeys || permissionKeys.length === 0) return false;
  if (isSuperAdmin(user)) return true;

  const permissions = await getUserPermissions(user, preloadedPermissions);
  return permissionKeys.some((key) => permissions.has(key));
}

/**
 * Central Authorization Function: check if user has ALL of the specified permissions.
 */
export async function hasAllPermissions(
  user: UserAuthContext | any,
  permissionKeys: string[],
  preloadedPermissions?: Set<string> | string[]
): Promise<boolean> {
  if (!user || !permissionKeys || permissionKeys.length === 0) return false;
  if (isSuperAdmin(user)) return true;

  const permissions = await getUserPermissions(user, preloadedPermissions);
  return permissionKeys.every((key) => permissions.has(key));
}

/**
 * Enforcement Function: requires a specific permission or returns authorization failure.
 */
export async function requirePermission(
  user: UserAuthContext | any,
  permissionKey: string
): Promise<{ authorized: boolean; reason?: string }> {
  if (!user) {
    return { authorized: false, reason: "Unauthenticated" };
  }

  const authorized = await hasPermission(user, permissionKey);
  if (!authorized) {
    return {
      authorized: false,
      reason: `Forbidden: user lacks required permission '${permissionKey}'`,
    };
  }

  return { authorized: true };
}

/**
 * Enforcement Function: requires ANY of the specified permissions.
 */
export async function requireAnyPermission(
  user: UserAuthContext | any,
  permissionKeys: string[]
): Promise<{ authorized: boolean; reason?: string }> {
  if (!user) {
    return { authorized: false, reason: "Unauthenticated" };
  }

  const authorized = await hasAnyPermission(user, permissionKeys);
  if (!authorized) {
    return {
      authorized: false,
      reason: `Forbidden: user lacks any of the required permissions [${permissionKeys.join(", ")}]`,
    };
  }

  return { authorized: true };
}

/**
 * Enforcement Function: requires ALL of the specified permissions.
 */
export async function requireAllPermissions(
  user: UserAuthContext | any,
  permissionKeys: string[]
): Promise<{ authorized: boolean; reason?: string }> {
  if (!user) {
    return { authorized: false, reason: "Unauthenticated" };
  }

  const authorized = await hasAllPermissions(user, permissionKeys);
  if (!authorized) {
    return {
      authorized: false,
      reason: `Forbidden: user lacks all of the required permissions [${permissionKeys.join(", ")}]`,
    };
  }

  return { authorized: true };
}

/**
 * Enforcement Function: requires a protected system role (SUPER_ADMIN).
 */
export async function requireSystemRole(
  user: UserAuthContext | any,
  allowedRoleTypes: (RoleType | string)[] = [RoleType.SUPER_ADMIN]
): Promise<{ authorized: boolean; reason?: string }> {
  if (!user) {
    return { authorized: false, reason: "Unauthenticated" };
  }

  const roleInfo = await resolveUserRole(user);
  if (!roleInfo || !roleInfo.roleType) {
    return { authorized: false, reason: "Forbidden: user does not have a recognized system role" };
  }

  const hasSystemRole = allowedRoleTypes.some(
    (type) => String(type).toUpperCase() === String(roleInfo.roleType).toUpperCase()
  );

  if (!hasSystemRole) {
    return {
      authorized: false,
      reason: `Forbidden: action requires system role [${allowedRoleTypes.join(", ")}]`,
    };
  }

  return { authorized: true };
}
