import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export default async function EmployeeListPage() {
  const cookieStore = await cookies();
  const user = getUserFromToken(cookieStore.get("token")?.value || "");

  if (!user) redirect("/login");
  if (!(await checkPermission(user, PERMISSION_KEYS.EMPLOYEE_VIEW))) {
    redirect("/403");
  }

  const [
    canDeleteEmployee,
    canCreateEmployee,
    canExportEmployees,
  ] = await Promise.all([
    checkPermission(user, PERMISSION_KEYS.EMPLOYEE_DELETE),
    checkPermission(user, PERMISSION_KEYS.EMPLOYEE_CREATE),
    checkPermission(user, PERMISSION_KEYS.EMPLOYEE_EXPORT),
  ]);

  let userData = null;
  try {
    userData = await prisma.users.findUnique({
      where: { empid: String(user.empid || user.id) },
      select: {
        empid: true,
        name: true,
        email: true,
        profile_photo: true,
        position: true,
        roleId: true,
        rbacRole: {
          select: {
            name: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
  }

  return (
    <Suspense fallback={null}>
      <ClientPage
        user={{
          id: user.id,
          empid: userData?.empid || user.empid,
          name: userData?.name || user.name,
          role: userData?.rbacRole?.name || null,
          email: userData?.email || user.email,
          profile_photo: userData?.profile_photo || null,
          position: userData?.position || null,
          roleId: userData?.roleId || null,
        }}
        canDeleteEmployee={canDeleteEmployee}
        canCreateEmployee={canCreateEmployee}
        canExportEmployees={canExportEmployees}
      />
    </Suspense>
  );
}
