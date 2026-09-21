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
        where: { status: "active" },
        select: { name: true },
      });
      return allRoles.map((r) => r.name);
    }

    if (isSuperAdmin(user)) {
      const allRoles = await prisma.role.findMany({
        where: { status: "active" },
        select: { name: true },
      });
      return allRoles.map((r) => r.name);
    }

    const assignable = await getAssignableRolesForUser(user);
    if (assignable && assignable.length > 0) {
      return assignable.map((r: any) => r.name);
    }

    const allRoles = await prisma.role.findMany({
      where: { status: "active" },
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
