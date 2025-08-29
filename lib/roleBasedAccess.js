export function getAccessibleRoles(userRole) {
  const role = userRole.toLowerCase();
  
  switch (role) {
    case 'hr':
      return ['employee'];
    case 'admin':
      return ['employee', 'hr'];
    case 'superadmin':
      return ['employee', 'hr', 'admin', 'superadmin'];
    default:
      return [];
  }
}

export function canAccessRole(userRole, targetRole) {
  const accessibleRoles = getAccessibleRoles(userRole);
  return accessibleRoles.includes(targetRole.toLowerCase());
}