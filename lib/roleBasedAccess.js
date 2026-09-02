export function getAccessibleRoles(userRole) {
  // Under dynamic RBAC, any authorized staff can access all active user roles
  return ['employee', 'hr', 'admin', 'superadmin', 'ceo', 'recruiter', 'recruter'];
}

export function canAccessRole(userRole, targetRole) {
  return true;
}