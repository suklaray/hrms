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

        const normalizedStatus = String(status).toUpperCase();

        const isNumeric = !isNaN(Number(id)) && /^\d+$/.test(String(id).trim());
        const existingFy = await prisma.financial_year.findFirst({
            where: isNumeric
                ? { OR: [{ id: Number(id) }, { uid: String(id) }] }
                : { uid: String(id) },
        });

        if (!existingFy) {
            return NextResponse.json({ success: false, message: 'Financial year not found' }, { status: 404 });
        }

        // Check if financial year is locked
        if (existingFy.lock) {
            return NextResponse.json({
                success: false,
                message: 'This financial year is locked. Its status cannot be changed.'
            }, { status: 400 });
        }

        if (normalizedStatus === 'ACTIVE') {
            const existingActive = await prisma.financial_year.findFirst({
                where: {
                    company_id: existingFy.company_id || company_id,
                    status: 'ACTIVE',
                    uid: { not: existingFy.uid }
                }
            });

            if (existingActive) {
                return NextResponse.json({
                    success: false,
                    message: 'Only one financial year can be active at a time. Please close the existing active year first.'
                }, { status: 400 });
            }
        }

        const updatedFinancialYear = await prisma.$transaction(async (tx) => {
            const financialYear = await tx.financial_year.update({
                where: { uid: existingFy.uid },
                data: {
                    status: normalizedStatus as any,
                },
            });

            const fyIdentifiers = [existingFy.uid, String(existingFy.id)];

            if (normalizedStatus === 'CLOSED' || normalizedStatus === 'DRAFT') {
                // Change status of payroll configurations for this financial year to INACTIVE
                await tx.payroll_configuration.updateMany({
                    where: {
                        financial_year_id: { in: fyIdentifiers },
                    },
                    data: {
                        status: 'INACTIVE',
                    },
                });

                // Change status of open payroll periods for this financial year to UNPROCESSED
                await tx.payroll_period.updateMany({
                    where: {
                        financial_year_id: { in: fyIdentifiers },
                        status: 'OPEN',
                    },
                    data: {
                        status: 'UNPROCESSED',
                    },
                });

                if (normalizedStatus === 'DRAFT') {
                    // Change active salary structures for this financial year to INACTIVE
                    await tx.employee_salary_structure.updateMany({
                        where: {
                            financial_year_id: { in: fyIdentifiers },
                            status: 'ACTIVE',
                        },
                        data: {
                            status: 'INACTIVE',
                        },
                    });
                } else if (normalizedStatus === 'CLOSED') {
                    // Change salary structures for this financial year to CLOSED
                    await tx.employee_salary_structure.updateMany({
                        where: {
                            financial_year_id: { in: fyIdentifiers },
                        },
                        data: {
                            status: 'CLOSED',
                        },
                    });
                }
            } else if (normalizedStatus === 'ACTIVE') {
                // Change status of payroll configurations for this financial year to ACTIVE
                await tx.payroll_configuration.updateMany({
                    where: {
                        financial_year_id: { in: fyIdentifiers },
                    },
                    data: {
                        status: 'ACTIVE',
                    },
                });

                // Change status of employee salary structures for this financial year to ACTIVE
                await tx.employee_salary_structure.updateMany({
                    where: {
                        financial_year_id: { in: fyIdentifiers },
                    },
                    data: {
                        status: 'ACTIVE',
                    },
                });

                // Change status of unprocessed payroll periods for this financial year to OPEN
                await tx.payroll_period.updateMany({
                    where: {
                        financial_year_id: { in: fyIdentifiers },
                        status: 'UNPROCESSED',
                    },
                    data: {
                        status: 'OPEN',
                    },
                });
            }

            return financialYear;
        });

        return NextResponse.json({ success: true, message: 'Financial year updated successfully', data: updatedFinancialYear }, { status: 200 });
    } catch (error: any) {
        console.error('Error updating financial year:', error);
        return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
    }
}