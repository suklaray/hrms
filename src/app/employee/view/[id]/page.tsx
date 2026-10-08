import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkAllPermissions, checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailsPage() {
  const cookieStore = await cookies();
  const user = getUserFromToken(cookieStore.get("token")?.value || "");

  if (!user) redirect("/login");
  if (
    !(await checkAllPermissions(user, [
      PERMISSION_KEYS.EMPLOYEE_VIEW,
      PERMISSION_KEYS.EMPLOYEE_EDIT,
    ]))
  ) {
    redirect("/403");
  }

  const canRequestResubmission = await checkPermission(
    user,
    PERMISSION_KEYS.COMPLIANCE_REQUEST_RESUBMISSION
  );

  return (
    <Suspense fallback={null}>
      <ClientPage canRequestResubmission={canRequestResubmission} />
    </Suspense>
  );
}
