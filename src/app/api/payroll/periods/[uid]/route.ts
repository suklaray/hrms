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

// ─── GET /api/payroll/periods/:uid (Fetch Single Payroll Period) ──────────────
export async function GET(
    req: NextRequest,
    context: { params: Promise<{ uid: string }> }
) {
    const auth = await checkAuth(req);
    if (auth.error) return auth.error;

    try {
        const { uid } = await context.params;

        if (!uid) {
            return NextResponse.json(
                { success: false, message: "Period UID is required" },
                { status: 400 }
            );
        }

        const period = await prisma.payroll_period.findUnique({
            where: { uid },
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
                        lock: true,
                    },
                },
                payroll_configuration: {
                    select: {
                        uid: true,
                        payroll_cycle: true,
                        currency: true,
                        salary_payment_date: true,
                        payroll_country: true,
                        status: true,
                    },
                },
            },
        });

        if (!period) {
            return NextResponse.json(
                { success: false, message: "Payroll period not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                success: true,
                data: period,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error fetching payroll period by UID:", error);
        return NextResponse.json(
            { success: false, message: error?.message || "Failed to fetch payroll period" },
            { status: 500 }
        );
    }
}
