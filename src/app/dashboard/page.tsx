import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission, getUserPermissions, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

async function getServerSideProps(context) {
  const { req } = context;
  const token = req?.cookies?.token || "";
  const user = getUserFromToken(token);

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  const hasDashboardAccess = await checkPermission(
    user,
    PERMISSION_KEYS.DASHBOARD_VIEW
  );

  if (!hasDashboardAccess) {
    return {
      redirect: {
        destination: "/403",
        permanent: false,
      },
    };
  }
  const permissions = await getUserPermissions(user);
  let userData = null;
  try {
    userData = await prisma.users.findUnique({
      where: { empid: user.empid },
      select: { empid: true, name: true, email: true, profile_photo: true, position: true, role: true ,roleId: true, rbacRole:{select:{id:true,name:true}}},
    });
  } catch (e) {
    console.error("Dashboard getServerSideProps error:", e);
  }

  return {
    props: {
      user: {
        id: user.id,
        empid: userData?.empid || user.empid,
        name: userData?.name || user.name,
        role: (userData?.role || user.role).toLowerCase(),
        email: userData?.email || user.email,
        profile_photo: userData?.profile_photo || null,
        position: userData?.position || null,
        verified: user.verified || null,
        form_submitted: user.form_submitted || false,
        roleId: userData?.roleId || user.roleId || null,
        rbacRole: userData?.rbacRole || null,
      },
      permissions: Array.from(permissions),
    },
  };
}

export default async function Page(props: {
  params?: Promise<Record<string, string | string[]>>;
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const cookieStore = await cookies();
  const resolvedParams = (await props.params) || {};
  const resolvedSearchParams = (await props.searchParams) || {};

  const cookieMap: Record<string, string> = {};
  cookieStore.getAll().forEach((c) => {
    cookieMap[c.name] = c.value;
  });

  const context = {
    req: {
      cookies: cookieMap,
      headers: {},
    },
    params: resolvedParams,
    query: { ...resolvedParams, ...resolvedSearchParams },
  };

  let gsspResult: any = null;
  try {
    gsspResult = await getServerSideProps(context);
  } catch (err) {
    console.error("Error running getServerSideProps in dashboard:", err);
  }

  if (gsspResult?.redirect?.destination) {
    redirect(gsspResult.redirect.destination);
  }

  return (
    <Suspense fallback={null}>
      <ClientPage {...(gsspResult?.props || {})} />
    </Suspense>
  );
}
