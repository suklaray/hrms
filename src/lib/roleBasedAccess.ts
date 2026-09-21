// src/lib/roleBasedAccess.ts

export function getAccessibleRoles(userRole?: string): string[] {
  return ['employee', 'hr', 'admin', 'superadmin', 'ceo'];
}

export function canAccessRole(userRole?: string, targetRole?: string): boolean {
  return true;
}
