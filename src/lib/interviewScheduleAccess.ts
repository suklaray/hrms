import { isSuperAdmin } from "@/lib/rbac";
import { resolveUserRole } from "@/rbac/service";

export async function canManageInterviewSchedules(user: Parameters<typeof resolveUserRole>[0]) {
  const roleInfo = await resolveUserRole(user);
  return (
    String(user && typeof user === "object" ? user.role : "").toLowerCase() === "admin" ||
    /admin/i.test(roleInfo?.roleName || "") ||
    isSuperAdmin(user) ||
    roleInfo?.roleType === "SUPER_ADMIN"
  );
}
