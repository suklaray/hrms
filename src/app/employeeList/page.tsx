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
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.EMPLOYEE_VIEW);
  if (!hasAccess) {
    return {
      redirect: {
        destination: "/403",
        permanent: false,
      },
    };
  }

  let userData = null;
  try {
    // Include the role relation to get role name from Role table
    userData = await prisma.users.findUnique({
      where: { empid: String(user.empid || user.id) },
      select: {
        empid: true,
        name: true,
        email: true,
        profile_photo: true,
        position: true,
        roleId: true, // Keep for reference
        rbacRole: { // Get role from Role table via relation
          select: {
            name: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
  }

  // Get role name from rbacRole relation, fallback to null
  const roleName = userData?.rbacRole?.name || null;

  return {
    props: {
      user: {
        id: user.id,
        empid: userData?.empid || user.empid,
        name: userData?.name || user.name,
        role: roleName, // Use role from Role table
        email: userData?.email || user.email,
        profile_photo: userData?.profile_photo || null,
        position: userData?.position || null,
        roleId: userData?.roleId || null, // Include roleId for reference
      },
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
    console.error("Error running getServerSideProps in employeeList:", err);
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
