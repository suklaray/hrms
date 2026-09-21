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
    const token = req?.cookies?.token || req?.cookies?.employeeToken || "";
    const user = getUserFromToken(token);
    console.log('User from token:', user);
    // If user is authenticated, redirect to appropriate dashboard
    //   if (user) {
    //     if (user.role === 'employee') {
    //       return {
    //         redirect: {
    //           destination: '/employee/dashboard',
    //           permanent: false,
    //         },
    //       };
    //     } else if (['hr', 'admin', 'superadmin'].includes(user.role)) {
    //       return {
    //         redirect: {
    //           destination: '/dashboard',
    //           permanent: false,
    //         },
    //       };
    //     }
    //   }

    return {
        props: {
        isAuthenticated: !!user,
        user: user || null,
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
    console.error("Error running getServerSideProps in index:", err);
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
