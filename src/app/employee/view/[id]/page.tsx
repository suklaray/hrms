import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkAnyPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export default async function EmployeeDetailsPage() {
  const cookieStore = await cookies();
  const user = getUserFromToken(cookieStore.get("token")?.value || "");

  if (!user) redirect("/login");

  const canRequestResubmission = await checkAnyPermission(
    user,
    [
      PERMISSION_KEYS.EMPLOYEE_VIEW,
      PERMISSION_KEYS.EMPLOYEE_EDIT,
      PERMISSION_KEYS.COMPLIANCE_REQUEST_RESUBMISSION
    ]
  );

  return (
    <Suspense fallback={null}>
      <ClientPage canRequestResubmission={canRequestResubmission} />
    </Suspense>
  );
}
