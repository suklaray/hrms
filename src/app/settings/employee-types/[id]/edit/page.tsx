import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission, getUserPermissions, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

async function getServerSideProps(context?: any) {
  return { props: {} };
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
    console.error("Error running getServerSideProps in settings/employee-types/[id]/edit:", err);
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
