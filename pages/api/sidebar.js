// pages/api/sidebar.js
// Single endpoint for ALL users (HR, Admin, Employee, SuperAdmin, custom roles).
//
// Priority:
//   1. superadmin (users.role === 'superadmin') → isSuperAdmin: true
//   2. roleId assigned → permissions from DB (employee type)
//   3. legacy role enum (hr / admin / ceo / employee) → ROLE_DEFAULT_PERMISSIONS

import { withSessionTimeout } from '@/lib/authMiddleware';
import { isSuperAdmin, getUserPermissions, ROLE_DEFAULT_PERMISSIONS } from '@/lib/rbac';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const user = req.user;

  // 1. Super Admin — bypass all checks
  if (isSuperAdmin(user)) {
    return res.status(200).json({ isSuperAdmin: true, permissions: [] });
  }

  // 2. Has a custom employee type (roleId) → use DB permissions
  if (user.roleId) {
    const permissions = await getUserPermissions(user.roleId);
    return res.status(200).json({ isSuperAdmin: false, permissions: Array.from(permissions) });
  }

  // 3. Legacy role enum fallback
  const role = user.role?.toLowerCase();
  const defaults = ROLE_DEFAULT_PERMISSIONS[role] ?? [];
  return res.status(200).json({ isSuperAdmin: false, permissions: defaults });
}

export default withSessionTimeout(handler);
