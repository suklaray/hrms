// lib/rbac.js
// Centralized RBAC helpers. All permission checks go through here.
// Super Admin bypasses all permission checks.

import prisma from "@/lib/prisma";

const SUPER_ADMIN_ROLE = "Super Admin";

// ─── Default permissions per legacy role enum (fallback when roleId is null) ──
// Used only when a user has no employee type (roleId) assigned.
// Employees have no permissions here — they use the /employee portal.
export const ROLE_DEFAULT_PERMISSIONS = {
  hr: [
    'dashboard.view',
    'employee.view', 'employee.create', 'employee.edit', 'employee.verify', 'employee.send_credentials', 'employee.reset_password',
    'attendance.view', 'attendance.edit', 'attendance.analytics', 'attendance.my_hr', 'attendance.regularize', 'attendance.regularize_approve',
    'leave.view', 'leave.approve', 'leave.cancel', 'leave.request', 'leave.view_own', 'leave.manage_types',
    'payroll.view', 'payslip.view',
    'recruitment.view', 'recruitment.create', 'recruitment.edit', 'recruitment.update_status', 'recruitment.send_mail',
    'task.view', 'task.create', 'task.edit', 'task.my', 'task.update_status',
    'report.view', 'report.submit',
    'compliance.view', 'compliance.view_documents',
    'calendar.view',
    'settings.profile', 'settings.change_password', 'settings.position_view', 'settings.position_manage',
    'notification.view',
  ],
  admin: [
    'dashboard.view',
    'employee.view', 'employee.create', 'employee.edit', 'employee.delete', 'employee.verify', 'employee.send_credentials', 'employee.reset_password',
    'attendance.view', 'attendance.edit', 'attendance.analytics', 'attendance.my_hr', 'attendance.regularize', 'attendance.regularize_approve',
    'leave.view', 'leave.approve', 'leave.cancel', 'leave.request', 'leave.view_own', 'leave.manage_types',
    'payroll.view', 'payroll.generate', 'payroll.edit', 'payslip.view',
    'recruitment.view', 'recruitment.create', 'recruitment.edit', 'recruitment.delete', 'recruitment.update_status', 'recruitment.send_mail', 'recruitment.convert_employee',
    'task.view', 'task.create', 'task.edit', 'task.delete', 'task.my', 'task.update_status',
    'report.view', 'report.submit',
    'compliance.view', 'compliance.view_documents', 'compliance.request_resubmission',
    'calendar.view', 'calendar.manage',
    'settings.profile', 'settings.change_password', 'settings.position_view', 'settings.position_manage', 'settings.employee_types_manage', 'settings.bot',
    'notification.view',
    'customer.view', 'customer.delete',
  ],
  employee: [
    'dashboard.view',
    'settings.profile', 'settings.change_password',
    'attendance.my',
    'leave.request', 'leave.view_own',
    'payslip.view',
    'calendar.view',
    'task.my', 'task.update_status',
    'report.submit',
    'document.submit', 'document.view_own',
    'notification.view',
  ],
  ceo: [
    'dashboard.view',
    'employee.view',
    'attendance.view', 'attendance.analytics',
    'leave.view',
    'payroll.view', 'payslip.view',
    'recruitment.view',
    'task.view', 'report.view',
    'compliance.view',
    'calendar.view',
    'settings.profile', 'settings.change_password',
    'notification.view',
  ],
};

// ─── Core helpers ────────────────────────────────────────────────────────────

export function isSuperAdmin(user) {
  // Works with both old enum ("superadmin") and new RBAC role name ("Super Admin")
  return (
    user?.rbacRole?.name === SUPER_ADMIN_ROLE ||
    user?.role === "superadmin" ||
    user?.role?.toLowerCase() === "superadmin"
  );
}

/**
 * Load all permission keys for a user's role from DB.
 * Supports passing a user object, roleId number/string, or (roleId, legacyRole).
 * Returns a Set<string> of permission keys.
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

  // Fetch current user details from DB if user ID is available
  if (userId) {
    try {
      const dbUser = await prisma.users.findUnique({
        where: typeof userId === "number" ? { id: userId } : { empid: String(userId) },
        select: { roleId: true, role: true, rbacRole: { select: { name: true } } },
      });
      if (dbUser) {
        roleId = dbUser.roleId ?? roleId;
        role = dbUser.role ?? role;
        if (dbUser.rbacRole?.name === SUPER_ADMIN_ROLE || dbUser.role?.toLowerCase() === "superadmin") {
          const { PERMISSIONS } = await import("@/lib/rbacPermissions");
          return new Set(PERMISSIONS.map((p) => p.key));
        }
      }
    } catch (error) {
      console.error("Error fetching user role in getUserPermissions:", error);
    }
  }

  // Super Admin bypass check
  if (role?.toLowerCase() === "superadmin") {
    const { PERMISSIONS } = await import("@/lib/rbacPermissions");
    return new Set(PERMISSIONS.map((p) => p.key));
  }

  // Check DB permissions for assigned roleId
  if (roleId) {
    const rolePerms = await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permission: { select: { key: true } } },
    });
    if (rolePerms.length > 0) {
      return new Set(rolePerms.map((rp) => rp.permission.key));
    }
  }

  // Fallback to default permissions by legacy role enum
  const roleKey = role?.toLowerCase() || "employee";
  const defaults = ROLE_DEFAULT_PERMISSIONS[roleKey] || ROLE_DEFAULT_PERMISSIONS.employee;
  return new Set(defaults);
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
