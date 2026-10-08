import prisma from "@/lib/prisma";
import { isSuperAdmin, getAssignableRolesForUser } from "@/lib/rbac";

/**
 * Dynamically retrieves accessible roles from the database.
 * If a user is provided:
 * - Super Admins receive all active roles.
 * - Other users receive roles accessible to them based on role hierarchy.
 * If no user is provided, returns all active roles from the `roles` table.
 */
export async function getAccessibleRoles(user?: any): Promise<string[]> {
  try {
    if (!user) {
      const allRoles = await prisma.role.findMany({
        where: { status: "ACTIVE" },
        select: { name: true },
      });
      return allRoles.map((r) => r.name);
    }

    if (isSuperAdmin(user)) {
      const allRoles = await prisma.role.findMany({
        where: { status: "ACTIVE" },
        select: { name: true },
      });
      return allRoles.map((r) => r.name);
    }

    const assignable = await getAssignableRolesForUser(user);
    if (assignable && assignable.length > 0) {
      return assignable.map((r: any) => r.name);
    }

    const allRoles = await prisma.role.findMany({
      where: { status: "ACTIVE" },
      select: { name: true },
    });
    return allRoles.map((r) => r.name);
  } catch (error) {
    console.error("Error fetching accessible roles dynamically from DB:", error);
    return [];
  }
}

/**
 * Checks if a user can access a target role dynamically.
 */
export async function canAccessRole(user: any, targetRoleIdOrName: number | string): Promise<boolean> {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  try {
    const accessible = await getAccessibleRoles(user);
    if (typeof targetRoleIdOrName === "string") {
      return accessible.some((name) => name.toLowerCase() === targetRoleIdOrName.toLowerCase());
    }
    const assignable = await getAssignableRolesForUser(user);
    return assignable.some((r: any) => r.id === targetRoleIdOrName);
  } catch (error) {
    console.error("Error checking canAccessRole:", error);
    return false;
  }
}

export async function getEmployeeDirectoryRoleScope(user: {
  empid?: string;
  id?: number | string;
}) {
  const currentUser = user.empid
    ? await prisma.users.findUnique({
        where: { empid: user.empid },
        select: {
          id: true,
          empid: true,
          roleId: true,
          rbacRole: { select: { id: true, name: true, parentId: true } },
        },
      })
    : typeof user.id === "number" ||
        (typeof user.id === "string" && /^\d+$/.test(user.id))
      ? await prisma.users.findUnique({
          where: { id: Number(user.id) },
          select: {
            id: true,
            empid: true,
            roleId: true,
            rbacRole: { select: { id: true, name: true, parentId: true } },
          },
        })
      : null;

  if (!currentUser) {
    return { currentUser: null, roles: [], visibleRoleIds: [] };
  }

  const currentRoleId = currentUser.roleId || currentUser.rbacRole?.id;
  if (!currentRoleId) {
    return { currentUser, roles: [], visibleRoleIds: [] };
  }

  const roles = await prisma.role.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      description: true,
      parentId: true,
      status: true,
    },
    orderBy: { name: "asc" },
  });

  if (isSuperAdmin(currentUser)) {
    return { currentUser, roles, visibleRoleIds: roles.map((role) => role.id) };
  }

  const findDescendantIds = (parentId: number): number[] => {
    const children = roles.filter((role) => role.parentId === parentId);
    return children.flatMap((child) => [
      child.id,
      ...findDescendantIds(child.id),
    ]);
  };

  return {
    currentUser,
    roles,
    visibleRoleIds: [...new Set(findDescendantIds(currentRoleId))],
  };
}
