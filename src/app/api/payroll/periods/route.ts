import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

async function checkAuth(req: NextRequest) {
    const token = req.cookies.get('token')?.value;
    if (!token) return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
    let decoded: any;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
        return { error: NextResponse.json({ message: 'Invalid token' }, { status: 401 }) };
    }
    const hasAccess =
        (await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_VIEW)) ||
        (await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_GENERATE));
    if (!hasAccess) return { error: NextResponse.json({ message: 'Forbidden: insufficient permissions' }, { status: 403 }) };
    return { decoded };
}

// ─── GET (Fetch Existing Payroll Periods) ─────────────────────────────────────
export async function GET(req: NextRequest) {
    const auth = await checkAuth(req);
    if (auth.error) return auth.error;

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


