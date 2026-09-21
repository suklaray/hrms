import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "../payroll-create-config/Client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export default async function CompanyPayrollConfigurationPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value || "";
  const user = getUserFromToken(token);

  if (!user) {
    redirect("/login");
  }

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.PAYROLL_GENERATE);
  if (!hasAccess) {
    redirect("/403");
  }

  return (
    <Suspense fallback={null}>
      <ClientPage user={user} />
    </Suspense>
  );
}
