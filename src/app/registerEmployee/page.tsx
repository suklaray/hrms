import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export default async function RegisterEmployeePage() {
  const cookieStore = await cookies();
  const user = getUserFromToken(cookieStore.get("token")?.value || "");

  if (!user) redirect("/login");
  if (!(await checkPermission(user, PERMISSION_KEYS.EMPLOYEE_CREATE))) {
    redirect("/403");
  }

  const canSendCredentials = await checkPermission(
    user,
    PERMISSION_KEYS.EMPLOYEE_SEND_CREDENTIALS
  );

  return (
    <Suspense fallback={null}>
      <ClientPage canSendCredentials={canSendCredentials} />
    </Suspense>
  );
}
