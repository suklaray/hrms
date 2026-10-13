import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import EmployeeDocumentForm from "./Client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission, getUserPermissions } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Employee Document Form - HRMS",
};

// Any one of these grants access to the page.
const REQUIRED_ANY = [
  PERMISSION_KEYS.DOCUMENT_SUBMIT,
  PERMISSION_KEYS.DOCUMENT_VIEW_OWN,
];

export default async function EmployeeDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("token")?.value ||
    cookieStore.get("employeeToken")?.value;

  const user = getUserFromToken(token || "");

  if (!user) redirect("/login");

  const permissions = await getUserPermissions(user);
  const hasAccess = REQUIRED_ANY.some((p) => permissions.has(p));

  if (!hasAccess) redirect("/403");

  const { id } = await params;

  return (
    <EmployeeDocumentForm
      permissions={Array.from(permissions)}
      targetEmployeeId={id}
    />
  );
}