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

  const [canView, canUpload, canDelete] = await Promise.all([
    checkPermission(user, PERMISSION_KEYS.SETTINGS_BOT),
    checkPermission(user, PERMISSION_KEYS.SETTINGS_BOT_UPLOAD),
    checkPermission(user, PERMISSION_KEYS.SETTINGS_BOT_DELETE),
  ]);
  if (!canView) redirect("/403");

  return (
    <Suspense fallback={null}>
      <ClientPage canUpload={canUpload} canDelete={canDelete} />
    </Suspense>
  );
}
