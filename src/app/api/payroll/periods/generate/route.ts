import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { generatePayrollPeriods } from "@/lib/payroll/generatePayrollPeriods";

async function checkAuth(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    if (!token) return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
    let decoded: any;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
        return { error: NextResponse.json({ message: "Invalid token" }, { status: 401 }) };
    }
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_GENERATE);
    if (!hasAccess) {
        return { error: NextResponse.json({ message: "Forbidden: insufficient permissions" }, { status: 403 }) };
    }
    return { decoded };
}

// ─── POST (Generate Payroll Periods) ──────────────────────────────────────────
export async function POST(req: NextRequest) {
    const auth = await checkAuth(req);
    if (auth.error) return auth.error;

    try {
        const body = await req.json().catch(() => ({}));
        const {
            financial_year_id,
            configuration_id,
            dryRun,
            previewOnly,
        } = body;

        const targetFyId = financial_year_id;
        const targetConfigId = configuration_id;

        if (!targetFyId && !targetConfigId) {
            return NextResponse.json(
                { success: false, message: "Please provide financial_year_id or configuration_id" },
                { status: 400 }
            );
        }

        // Fetch Financial Year if ID provided
        let financialYear: any = null;
        if (targetFyId) {
            financialYear = await prisma.financial_year.findFirst({
                where: {
                    OR: [
                        { uid: String(targetFyId) },
                        { id: isNaN(Number(targetFyId)) ? undefined : Number(targetFyId) },
                    ],
                },
                include: {
                    company: true,
                },
            });
        }

        // Fetch Payroll Configuration if ID provided
        let configuration: any = null;
        if (targetConfigId) {
            configuration = await prisma.payroll_configuration.findFirst({
                where: {
                    OR: [
                        { uid: String(targetConfigId) },
                        { id: isNaN(Number(targetConfigId)) ? undefined : Number(targetConfigId) },
                    ],
                },
                include: {
                    company: true,
                },
            });
        }

        // Auto-resolve configuration from financial year if not explicitly passed
        if (!configuration && financialYear) {
            configuration = await prisma.payroll_configuration.findFirst({
                where: {
                    financial_year_id: financialYear.uid,
                    status: "ACTIVE",
                },
                include: {
                    company: true,
                },
            });
        }

        // Auto-resolve financial year from configuration if not explicitly passed
        if (!financialYear && configuration) {
            financialYear = await prisma.financial_year.findFirst({
                where: {
                    uid: configuration.financial_year_id,
                },
                include: {
                    company: true,
                },
            });
        }

        if (!financialYear) {
            return NextResponse.json(
                { success: false, message: "Financial year not found" },
                { status: 404 }
            );
        }

        if (!configuration) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Active payroll configuration not found for this financial year",
                },
                { status: 404 }
            );
        }

        // Explicitly check whether periods already exist for this financial year
        const existingPeriodsCount = await prisma.payroll_period.count({
            where: {
                company_id: financialYear.company_id,
                financial_year_id: financialYear.uid,
            },
        });

        if (existingPeriodsCount > 0 && !(dryRun || previewOnly)) {
            const fyName = financialYear.name || "this financial year";
            return NextResponse.json(
                {
                    success: false,
                    message: `Payroll periods already generated for ${fyName}`,
                },
                { status: 400 }
            );
        }

        const result = await generatePayrollPeriods({
            financialYear,
            configuration,
            saveToDb: !(dryRun || previewOnly),
        });

        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        console.error("Error generating payroll periods:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to generate payroll periods" },
            { status: 400 }
        );
    }
}
