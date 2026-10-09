import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import ClientPage from "./Client";
import getUserFromToken from "@/lib/getUserFromToken";
import { checkAnyPermission, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value || "";
  const user = getUserFromToken(token);

  if (!user) {
    redirect("/login");
  }

  // Allow access if user has permission to view own payslip, view any payslip, or generate payslip
  const hasAccess = await checkAnyPermission(user, [
    PERMISSION_KEYS.PAYSLIP_VIEW_OWN,
    PERMISSION_KEYS.PAYSLIP_VIEW,
    PERMISSION_KEYS.PAYSLIP_GENERATE,
  ]);

  if (!hasAccess) {
    redirect("/403");
  }

  // If user only has PAYSLIP_VIEW_OWN (and is not super admin or manager with broader view access),
  // verify ownership so employees can ONLY access their own payslip.
  const isSuper = isSuperAdmin(user);
  const canViewAny =
    isSuper ||
    (await checkAnyPermission(user, [
      PERMISSION_KEYS.PAYSLIP_VIEW,
      PERMISSION_KEYS.PAYSLIP_GENERATE,
    ]));

  if (!canViewAny) {
    const trimmedId = id.trim();
    const isNumeric = !isNaN(Number(trimmedId)) && /^\d+$/.test(trimmedId);

    const record = await prisma.payroll.findFirst({
      where: isNumeric
        ? {
            OR: [
              { id: Number(trimmedId) },
              { uid: trimmedId },
            ],
          }
        : { uid: trimmedId },
      select: {
        empid: true,
        users: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!record) {
      redirect("/403");
    }

    const isOwner =
      (user.empid && String(record.empid).toLowerCase() === String(user.empid).toLowerCase()) ||
      (user.id && record.users?.id === Number(user.id)) ||
      (user.email && record.users?.email?.toLowerCase() === user.email.toLowerCase());

    if (!isOwner) {
      redirect("/403");
    }
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading payslip details...</p>
          </div>
        </div>
      }
    >
      <ClientPage id={id} />
    </Suspense>
  );
}
