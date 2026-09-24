import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission, getUserPermissions, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

async function getServerSideProps(context: { req: any; params?: Record<string, string | string[]>; query?: { [x: string]: string | string[]; }; }) {
  const { req } = context;
  const token = req?.cookies?.token || "";
  const user = getUserFromToken(token);

  if (!user) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const hasPayrollGenerateAccess = await checkPermission(
    user,
    PERMISSION_KEYS.PAYROLL_GENERATE
  );

  if (!hasPayrollGenerateAccess) {
    return {
      redirect: {
        destination: "/403",
        permanent: false,
      },
    };
  }

  return { props: { user } };
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
    console.error("Error running getServerSideProps in payroll/payroll-setup/payroll-create-config:", err);
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
