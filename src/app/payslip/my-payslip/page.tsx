import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import MyPayslipsClient from "./Client";
import getUserFromToken from "@/lib/getUserFromToken";
import { checkAnyPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export const dynamic = "force-dynamic";

export default async function Page() {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || "";
    const user = getUserFromToken(token);

    if (!user) {
        redirect("/login");
    }

    const hasAccess = await checkAnyPermission(user, [
        PERMISSION_KEYS.PAYSLIP_VIEW_OWN,
        PERMISSION_KEYS.PAYSLIP_VIEW,
        PERMISSION_KEYS.PAYSLIP_GENERATE,
    ]);

    if (!hasAccess) {
        redirect("/403");
    }

    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-slate-500 font-medium">Loading your payslips...</p>
                    </div>
                </div>
            }
        >
            <MyPayslipsClient />
        </Suspense>
    );
}
