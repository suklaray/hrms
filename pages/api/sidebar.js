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
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (isSuperAdmin(user)) {
    return res.status(200).json({ isSuperAdmin: true, permissions: [] });
  }

  const permissions = await getUserPermissions(user);
  return res.status(200).json({ isSuperAdmin: false, permissions: Array.from(permissions) });
}

export default withSessionTimeout(handler);
