import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Client from "./client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add Job Description - HRMS",
};

export default async function AddJobDescriptionPage() {
  const cookieStore = await cookies();
  const user = getUserFromToken(cookieStore.get("token")?.value || "");

  if (!user) redirect("/login");
  if (!(await checkPermission(user, PERMISSION_KEYS.JD_CREATE))) redirect("/403");

  return <Client />;
}