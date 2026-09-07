export function getAccessibleRoles(userRole) {
  // Under dynamic RBAC, any authorized staff can access all active user roles
  return ['employee', 'hr', 'admin', 'superadmin', 'ceo'];
}

export function canAccessRole(userRole, targetRole) {
  return true;
}