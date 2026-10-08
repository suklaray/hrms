import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export default async function Page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const user = getUserFromToken(token);

  if (!user) redirect("/login");

  const hasAccess = isSuperAdmin(user) || await checkPermission(user, PERMISSION_KEYS.AUDIT_VIEW);
  if (!hasAccess) redirect("/403");

  return (
    <Suspense fallback={null}>
      <ClientPage />
    </Suspense>
  );
}
