import Client from "./client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const metadata = {
  title: "Department & Position Management - HRMS",
};

export const dynamic = "force-dynamic";

export default async function DepartmentManagementPage() {
  const cookieStore = await cookies();
  const user = getUserFromToken(cookieStore.get("token")?.value || "");
  if (!user) redirect("/login");

  const [canAccessDepartments, canAccessPositions] = await Promise.all([
    checkPermission(user, PERMISSION_KEYS.SETTINGS_DEPARTMENT_VIEW),
    checkPermission(user, PERMISSION_KEYS.SETTINGS_POSITION_VIEW),
  ]);
  if (!canAccessDepartments && !canAccessPositions) redirect("/403");

  return (
    <Client
      canAccessDepartments={canAccessDepartments}
      canAccessPositions={canAccessPositions}
    />
  );
}