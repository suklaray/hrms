import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import getFinancialYear from "@/lib/financialYearCalculation";
import { checkAuth } from "@/lib/apiAuth";

// ─── POST (Create) ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_GENERATE]);
    if ("error" in auth) return auth.error;

    try {
        const body = await req.json().catch(() => ({}));
        const {
            company_id,
            start_date,
            end_date,
            status
        } = body;

        if (!company_id || !start_date || !end_date || !status) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        const fyName = getFinancialYear(start_date, end_date);

        const check = await prisma.financial_year.findFirst({
            where: {
                company_id,
                name: fyName
            }
        });

        if (check) {
            return NextResponse.json({ success: false, message: 'Financial year already exists' }, { status: 400 });
        }

        const financialYear = await prisma.financial_year.create({
            data: {
                company_id,
                name: fyName,
                start_date: new Date(start_date),
                end_date: new Date(end_date),
                status
            }
        });

        return NextResponse.json({ success: true, message: 'Financial year added successfully', data: financialYear }, { status: 200 });
    } catch (error: any) {
        console.error('Error adding financial year:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}

// ─── GET (Get Financial Years) ───────────────────────────────────────────
export async function GET(req: NextRequest) {
    const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_VIEW, PERMISSION_KEYS.PAYSLIP_GENERATE]);
    if ("error" in auth) return auth.error;

    try {
        const financialYears = await prisma.financial_year.findMany({
            include: {
                company: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        return NextResponse.json({ success: true, data: financialYears }, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching financial years:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}

// ─── PUT (Update Financial Year Status) ───────────────────────────
export async function PUT(req: NextRequest) {
    const auth = await checkAuth(req, [
        PERMISSION_KEYS.PAYROLL_GENERATE,
        PERMISSION_KEYS.PAYROLL_EDIT,
        PERMISSION_KEYS.PAYROLL_CHANGE_STATUS
    ]);
    if ("error" in auth) return auth.error;

    try {
        const body = await req.json().catch(() => ({}));
        const { id, status, company_id } = body;

        if (!id || !status || !company_id) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        if (status === 'ACTIVE') {
            const existingActive = await prisma.financial_year.findFirst({
                where: {
                    company_id,
                    status: 'ACTIVE',
                    uid: { not: id }
                }
            });

            if (existingActive) {
                return NextResponse.json({
                    success: false,
                    message: 'Only one financial year can be active at a time. Please close the existing active year first.'
                }, { status: 400 });
            }
        }

        const financialYear = await prisma.financial_year.update({
            where: { uid: id },
            data: {
                status
            },
        });

        return NextResponse.json({ success: true, message: 'Financial year updated successfully', data: financialYear }, { status: 200 });
    } catch (error: any) {
        console.error('Error updating financial year:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}