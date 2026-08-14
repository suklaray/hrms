// pages/api/employee/sidebar.js
// Permission priority:
//   1. Employee type (roleId → Role table) — primary
//   2. Legacy role enum fallback — always 'employee' for this portal
//   3. employee default permissions (self-service only)

import { withSessionTimeout } from '@/lib/authMiddleware';
import { getUserPermissions } from '@/lib/rbac';

// Default permissions every employee gets when no roleId is assigned
const EMPLOYEE_DEFAULT_PERMISSIONS = [
  'dashboard.view',
  'settings.profile',
  'settings.change_password',
  'attendance.my',
  'leave.request',
  'leave.view_own',
  'payslip.view',
  'calendar.view',
  'task.my',
  'task.update_status',
  'report.submit',
  'document.submit',
  'document.view_own',
  'notification.view',
];

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const user = req.user;

  // Priority 1: employee type (roleId) permissions from DB
  if (user.roleId) {
    const permissions = await getUserPermissions(user.roleId);
    return res.status(200).json({ permissions: Array.from(permissions) });
  }

  // Priority 2: default employee permissions
  return res.status(200).json({ permissions: EMPLOYEE_DEFAULT_PERMISSIONS });
}

export default withSessionTimeout(handler);
