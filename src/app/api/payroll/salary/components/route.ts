import { checkAuth } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { NextRequest, NextResponse } from "next/server";

// ─── GET (Read All) ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_GENERATE, PERMISSION_KEYS.PAYROLL_VIEW]);
    if ("error" in auth) return auth.error;

    try {
        const salaryComponents = await prisma.salary_component.findMany({
            include: {
                company: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return NextResponse.json({ success: true, salaryComponents });
    } catch (error: any) {
        console.error('Error fetching salary components:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}