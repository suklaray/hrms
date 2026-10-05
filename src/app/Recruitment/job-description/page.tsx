import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Client from "./client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Job Descriptions - HRMS",
};

export default async function JobDescriptionsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value || "";
  const user = getUserFromToken(token);

  if (!user) {
    redirect("/login");
  }

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.RECRUITMENT_VIEW);
  if (!hasAccess) {
    redirect("/403");
  }

  return <Client />;
}