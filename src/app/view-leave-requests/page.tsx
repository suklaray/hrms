import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/getUserFromToken";
import { checkPermission, getUserPermissions, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

async function getServerSideProps({ req }) {
  const token = req?.cookies?.token || '';
  const user = getUserFromToken(token);
  if (!user) return { redirect: { destination: '/login', permanent: false } };
  const [
    canViewPending,
    canViewHistory,
    canViewLeaveTypes,
    canCreateLeaveType,
    canEditLeaveType,
    canDeleteLeaveType,
  ] = await Promise.all([
    checkPermission(user, PERMISSION_KEYS.LEAVE_VIEW_PENDING),
    checkPermission(user, PERMISSION_KEYS.LEAVE_VIEW_HISTORY),
    checkPermission(user, PERMISSION_KEYS.LEAVE_VIEW_LEAVE_TYPES),
    checkPermission(user, PERMISSION_KEYS.LEAVE_CREATE_TYPE),
    checkPermission(user, PERMISSION_KEYS.LEAVE_EDIT_TYPE),
    checkPermission(user, PERMISSION_KEYS.LEAVE_DELETE_TYPE),
  ]);
  if (
    !canViewPending &&
    !canViewHistory &&
    !canViewLeaveTypes &&
    !canCreateLeaveType &&
    !canEditLeaveType &&
    !canDeleteLeaveType
  ) {
    return { redirect: { destination: '/403', permanent: false } };
  }
  return {
    props: {
      canViewPending,
      canViewHistory,
      canViewLeaveTypes,
      canCreateLeaveType,
      canEditLeaveType,
      canDeleteLeaveType,
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
    console.error("Error running getServerSideProps in view-leave-requests:", err);
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
