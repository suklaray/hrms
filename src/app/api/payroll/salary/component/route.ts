import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { checkAuth } from "@/lib/apiAuth";

// ─── POST (Create) ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_GENERATE]);
    if ("error" in auth) return auth.error;

    try {
        const body = await req.json().catch(() => ({}));

        const { company_id, name, code, type, calculation_type, taxable, statutory, formula, active } = body;

        if (!company_id || !name || !code || !type || !calculation_type || taxable === undefined || statutory === undefined || active === undefined) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        const existingCompany = await prisma.company.findUnique({
            where: { uid: company_id },
        });

        if (!existingCompany) {
            return NextResponse.json({ success: false, message: 'Company not found' }, { status: 404 });
        }

        const existingCode = await prisma.salary_component.findFirst({
            where: { company_id: company_id, code: code },
        });
        if (existingCode) {
            return NextResponse.json({ success: false, message: 'Salary component code already exists' }, { status: 400 });
        }

        try {
            const salary = await prisma.salary_component.create({
                data: {
                    company_id,
                    name,
                    code,
                    type,
                    calculation_type,
                    taxable,
                    statutory,
                    active,
                    formula
                },
            });
            return NextResponse.json({ success: true, salary });
        }
        catch (error: any) {
            console.error('Error adding salary component:', error);
            return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Error adding salary component:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}

// ─── PUT (Update / Toggle Status) ──────────────────────────────────────────────
export async function PUT(req: NextRequest) {
    const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_GENERATE]);
    if ("error" in auth) return auth.error;

    try {
        const body = await req.json().catch(() => ({}));

        const { uid, name, code, type, calculation_type, taxable, statutory, formula, active } = body;
        if (!uid) {
            return NextResponse.json({ success: false, message: "Missing uid" }, { status: 400 });
        }

        const existingSalary = await prisma.salary_component.findUnique({
            where: { uid },
        });

        if (!existingSalary) {
            return NextResponse.json({ success: false, message: "Salary component not found" }, { status: 404 });
        }

        if (code && code !== existingSalary.code) {
            const codeConflict = await prisma.salary_component.findFirst({
                where: { company_id: existingSalary.company_id, code: code, NOT: { uid } },
            });
            if (codeConflict) {
                return NextResponse.json({ success: false, message: 'Salary component code already exists for this company' }, { status: 400 });
            }
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (code !== undefined) updateData.code = code;
        if (type !== undefined) updateData.type = type;
        if (calculation_type !== undefined) updateData.calculation_type = calculation_type;
        if (taxable !== undefined) updateData.taxable = taxable;
        if (statutory !== undefined) updateData.statutory = statutory;
        if (active !== undefined) updateData.active = active;
        if (formula !== undefined) updateData.formula = formula;

        try {
            const updatedSalary = await prisma.salary_component.update({
                where: { uid },
                data: updateData,
            });
            return NextResponse.json({ success: true, salary: updatedSalary });
        } catch (error: any) {
            console.error('Error updating salary component:', error);
            return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Error updating salary component:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}