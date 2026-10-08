import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { checkAuth } from "@/lib/apiAuth";

// ─── GET (Fetch Existing Payroll Periods) ─────────────────────────────────────
export async function GET(req: NextRequest) {
    const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_GENERATE, PERMISSION_KEYS.PAYROLL_VIEW, PERMISSION_KEYS.PAYSLIP_GENERATE]);
    if ("error" in auth) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const financial_year_id = searchParams.get("financial_year_id");
        const configuration_id = searchParams.get("configuration_id");
        const company_id = searchParams.get("company_id");

        const status = searchParams.get("status");

        const where: any = {};
        if (financial_year_id) where.financial_year_id = financial_year_id;
        if (configuration_id) where.payroll_configuration_id = configuration_id;
        if (company_id) where.company_id = company_id;
        if (status) where.status = status.toUpperCase();

        const periods = await prisma.payroll_period.findMany({
            where,
            orderBy: {
                period_start: "asc",
            },
            include: {
                company: {
                    select: {
                        name: true,
                        uid: true,
                    },
                },
                financial_year: {
                    select: {
                        name: true,
                        uid: true,
                        start_date: true,
                        end_date: true,
                        status: true,
                    },
                },
                payroll_configuration: {
                    select: {
                        payroll_cycle: true,
                        currency: true,
                        salary_payment_date: true,
                        uid: true,
                    },
                },
            },
        });

        return NextResponse.json(
            {
                success: true,
                data: periods,
                count: periods.length,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error fetching payroll periods:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to fetch payroll periods" },
            { status: 500 }
        );
    }
}


