import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Client from "./Client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission, getUserPermissions } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export default async function CandidateMatchesPage() {
  const cookieStore = await cookies();
  const user = getUserFromToken(cookieStore.get("token")?.value || "");

  if (!user) redirect("/login");

  const canViewApplications = await checkPermission(
    user,
    PERMISSION_KEYS.JOB_APPLICATION_VIEW
  );
  const canViewCandidateRanks = await checkPermission(
    user,
    PERMISSION_KEYS.CANDIDATE_RANK_VIEW
  );

  if (!canViewApplications && !canViewCandidateRanks) redirect("/403");

  const permissions = await getUserPermissions(user);
  return <Client permissions={Array.from(permissions)} />;
}
