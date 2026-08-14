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
    user?.role === "superadmin"
  );
}

/**
 * Load all permission keys for a user's role from DB.
 * Returns a Set<string> of permission keys.
 */
export async function getUserPermissions(roleId) {
  if (!roleId) return new Set();

  const rolePerms = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permission: { select: { key: true } } },
  });

  return new Set(rolePerms.map((rp) => rp.permission.key));
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

    const permissions = await getUserPermissions(user.roleId);
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
  if (isSuperAdmin(user)) return true;
  const permissions = await getUserPermissions(user?.roleId);
  return permissions.has(permissionKey);
}
