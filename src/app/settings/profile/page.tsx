import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProfileClient from "./Client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission, getUserPermissions } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profile Settings - HRMS",
};

export default async function ProfilePage() {
  const cookieStore = await cookies();

  const token =
    cookieStore.get("token")?.value ||
    cookieStore.get("employeeToken")?.value;

  const user = getUserFromToken(token || "");

  if (!user) redirect("/login");

  const [
    canViewProfile,
    canSubmitDocuments,
    canViewOwnDocuments,
    permissions,
  ] = await Promise.all([
    checkPermission(user, PERMISSION_KEYS.SETTINGS_PROFILE),
    checkPermission(user, PERMISSION_KEYS.DOCUMENT_SUBMIT),
    checkPermission(user, PERMISSION_KEYS.DOCUMENT_VIEW_OWN),
    getUserPermissions(user),
  ]);

  if (!canViewProfile && !canSubmitDocuments && !canViewOwnDocuments) {
    redirect("/403");
  }

  return (
    <ProfileClient
      permissions={Array.from(permissions)}
      canViewProfile={canViewProfile}
      canSubmitDocuments={canSubmitDocuments}
      canViewOwnDocuments={canViewOwnDocuments}
    />
  );
}