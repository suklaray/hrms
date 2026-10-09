import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export default async function Page() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("token")?.value ||
    cookieStore.get("employeeToken")?.value;
  const user = getUserFromToken(token);
  if (!user) redirect("/login");

  const [
    canView,
    canManage,
    canCreate,
    canEdit,
    canDelete,
    canDownloadHolidays,
    canDownloadEvents,
  ] = await Promise.all([
    checkPermission(user, PERMISSION_KEYS.CALENDAR_VIEW),
    checkPermission(user, PERMISSION_KEYS.CALENDAR_MANAGE),
    checkPermission(user, PERMISSION_KEYS.CALENDAR_CREATE),
    checkPermission(user, PERMISSION_KEYS.CALENDAR_EDIT),
    checkPermission(user, PERMISSION_KEYS.CALENDAR_DELETE),
    checkPermission(user, PERMISSION_KEYS.CALENDAR_DOWNLOAD_HOLIDAYS),
    checkPermission(user, PERMISSION_KEYS.CALENDAR_DOWNLOAD_EVENTS),
  ]);

  if (!canView && !canManage) redirect("/403");

  return (
    <Suspense fallback={null}>
      <ClientPage
        canCreate={canCreate || canManage}
        canEdit={canEdit || canManage}
        canDelete={canDelete || canManage}
        canDownloadHolidays={canDownloadHolidays || canManage}
        canDownloadEvents={canDownloadEvents || canManage}
      />
    </Suspense>
  );
}
