import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Client from "./Client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export default async function EditJobDescriptionPage() {
  const cookieStore = await cookies();
  const user = getUserFromToken(cookieStore.get("token")?.value || "");

  if (!user) redirect("/login");
  if (!(await checkPermission(user, PERMISSION_KEYS.JD_EDIT))) redirect("/403");

  const canPublish = await checkPermission(user, PERMISSION_KEYS.JD_PUBLISH);

  return <Client canPublish={canPublish} />;
}
