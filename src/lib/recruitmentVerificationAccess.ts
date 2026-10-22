type RoleHierarchyEntry = {
  id: number;
  parentId: number | null;
};

export function canVerifyRecruitmentCandidate(
  userEmpid: string | undefined,
  userRoleId: number | null | undefined,
  hiringManagerEmpid: string | null | undefined,
  hiringManagerRoleId: number | null | undefined,
  roles: RoleHierarchyEntry[],
  hasVerifyPermission: boolean,
  hasGlobalAccess = false
) {
  if (!hasVerifyPermission) return false;
  if (hasGlobalAccess) return true;
  if (!hiringManagerEmpid) return false;
  if (userEmpid === hiringManagerEmpid) return true;
  if (!userRoleId || !hiringManagerRoleId) return false;

  const rolesById = new Map(roles.map((role) => [role.id, role]));
  let parentId = rolesById.get(hiringManagerRoleId)?.parentId;

  while (parentId != null) {
    if (parentId === userRoleId) return true;
    parentId = rolesById.get(parentId)?.parentId ?? null;
  }

  return false;
}
