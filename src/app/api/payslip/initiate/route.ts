import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { checkAuth } from "@/lib/apiAuth";
import crypto from "crypto";

type Payroll = Awaited<ReturnType<typeof prisma.payroll.findFirst>>;

// ─── POST (Initiate/Submit Individual Payroll Record) ─────────────────────────
export async function POST(req: NextRequest) {
    const auth = await checkAuth(req, [
        PERMISSION_KEYS.PAYSLIP_GENERATE
    ]);
    if ("error" in auth) return auth.error;

    try {
        const body = await req.json().catch(() => ({}));
        const payload = body.payload || body;

        const {
            uid: clientProvidedUid,
            companyInfo,
            employeeInfo,
            period,
            salaryDetails,
            salaryPaymentDate,
            totalPayableAmount,
        } = payload;

        if (!employeeInfo?.empid) {
            return NextResponse.json(
                { success: false, message: "Employee ID (empid) is required" },
                { status: 400 }
            );
        }

        if (!period) {
            return NextResponse.json(
                { success: false, message: "Payroll period name is required" },
                { status: 400 }
            );
        }

        // Extract period details
        const periodUid = typeof period === "object" && period !== null ? (period.uid || period.id) : null;
        const periodName = typeof period === "object" && period !== null ? period.name : (typeof period === "string" ? period : null);

        // Validate employee exists in users table
        const employeeUser = await prisma.users.findUnique({
            where: { empid: String(employeeInfo.empid) },
            select: { id: true, empid: true, name: true, company_id: true },
        });

        if (!employeeUser) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Employee with empid ${employeeInfo.empid} does not exist`,
                },
                { status: 404 }
            );
        }

        // Determine payroll period record if available
        let resolvedPeriod = null;
        if (periodUid || periodName) {
            resolvedPeriod = await prisma.payroll_period.findFirst({
                where: {
                    OR: [
                        ...(periodUid ? [{ uid: String(periodUid) }] : []),
                        ...(periodName ? [{ period_name: String(periodName) }] : []),
                    ],
                },
                select: { uid: true, period_name: true, company_id: true },
            });
        }

        const finalPeriodId = resolvedPeriod?.uid || periodUid || "";
        const finalPeriodName = resolvedPeriod?.period_name || periodName || "";

        // Determine company ID
        let companyId = companyInfo?.id || employeeUser.company_id || resolvedPeriod?.company_id;

        if (!companyId) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Company ID could not be identified for this payroll record",
                },
                { status: 400 }
            );
        }

        // Validate company exists in database
        const companyExists = await prisma.company.findUnique({
            where: { uid: companyId },
            select: { uid: true, name: true },
        });

        if (!companyExists) {
            return NextResponse.json(
                {
                    success: false,
                    message: `Company with ID ${companyId} not found`,
                },
                { status: 404 }
            );
        }

        // Parse numeric values for payroll table
        const grossSalary = Number(salaryDetails?.grossSalary || 0);
        const totalDeductions = Number(salaryDetails?.totalDeductions || 0);
        const netSalary = Number(
            salaryDetails?.netSalary !== undefined
                ? salaryDetails.netSalary
                : grossSalary - totalDeductions
        );

        const totalWorkingDays = Math.round(Number(salaryDetails?.attendance?.totalWorkingDays || 0));
        const daysWorked = Math.round(Number(salaryDetails?.attendance?.daysWorked || 0));
        const daysAbsent = Math.round(Number(salaryDetails?.attendance?.daysAbsent || 0));
        const overtimeHours = Math.round(
            Number(salaryDetails?.overtime?.hours ?? salaryDetails?.attendance?.overtimeHours ?? 0)
        );
        const overtimeRatePerHour = Number(salaryDetails?.overtime?.ratePerHour || 0);
        const weekend = Math.round(Number(salaryDetails?.attendance?.weekend || 0));

        let paymentDate: Date;
        if (salaryPaymentDate) {
            const parsed = new Date(salaryPaymentDate);
            paymentDate = isNaN(parsed.getTime()) ? new Date() : parsed;
        } else {
            paymentDate = new Date();
        }

        const finalTotalPayable = Number(
            totalPayableAmount !== undefined
                ? totalPayableAmount
                : salaryDetails?.basePayableAmount !== undefined
                    ? salaryDetails.basePayableAmount
                    : netSalary
        );

        // Prepare payroll components data (all earnings and deductions)
        const earnings = Array.isArray(salaryDetails?.earnings) ? salaryDetails.earnings : [];
        const deductions = Array.isArray(salaryDetails?.deductions) ? salaryDetails.deductions : [];

        const componentsToCreate: Array<{
            component_name: string;
            component_code: string;
            component_formulla: string;
            component_ammount: number;
            component_type: "EARNING" | "DEDUCTION";
        }> = [];

        for (const item of earnings) {
            componentsToCreate.push({
                component_name: String(item.name || item.component_name || "Earning"),
                component_code: String(item.code || item.component_code || "EARNING"),
                component_formulla: String(
                    item.formula ||
                    item.component_formulla ||
                    item.calculation_type ||
                    "FIXED"
                ),
                component_ammount: Number(item.amount ?? item.component_ammount ?? 0),
                component_type: "EARNING",
            });
        }

        for (const item of deductions) {
            componentsToCreate.push({
                component_name: String(item.name || item.component_name || "Deduction"),
                component_code: String(item.code || item.component_code || "DEDUCTION"),
                component_formulla: String(
                    item.formula ||
                    item.component_formulla ||
                    item.calculation_type ||
                    "FIXED"
                ),
                component_ammount: Number(item.amount ?? item.component_ammount ?? 0),
                component_type: "DEDUCTION",
            });
        }

        // Check if payroll already exists by client-provided uid or (empid, period_id / period_name)
        let existingPayroll = null;

        if (clientProvidedUid) {
            existingPayroll = await prisma.payroll.findUnique({
                where: { uid: String(clientProvidedUid) },
            });
        }

        if (!existingPayroll) {
            existingPayroll = await prisma.payroll.findFirst({
                where: {
                    empid: String(employeeInfo.empid),
                    OR: [
                        ...(finalPeriodId ? [{ period_id: String(finalPeriodId) }] : []),
                        ...(finalPeriodName ? [{ period_name: String(finalPeriodName) }] : []),
                    ],
                },
            });
        }

        // Check if status is locked (INITIATED, DISBURSED, REJECTED)
        if (existingPayroll) {
            const lockedStatuses = ["INITIATED", "DISBURSED", "REJECTED"];
            if (lockedStatuses.includes(existingPayroll.status)) {
                return NextResponse.json(
                    {
                        success: false,
                        message: `Payroll for ${employeeUser.name} (${employeeUser.empid}) for period '${finalPeriodName || finalPeriodId}' is currently ${existingPayroll.status} and cannot be modified.`,
                    },
                    { status: 400 }
                );
            }
        }

        let savedPayroll: Payroll;
        let isUpdate = false;

        if (existingPayroll) {
            isUpdate = true;
            const payrollUid = existingPayroll.uid || crypto.randomUUID();

            savedPayroll = await prisma.$transaction(async (tx) => {
                if (!existingPayroll.uid) {
                    await tx.payroll.update({
                        where: { id: existingPayroll.id },
                        data: { uid: payrollUid },
                    });
                }

                // Delete existing components referencing payroll_id (which is payroll.uid)
                await tx.payroll_components.deleteMany({
                    where: { payroll_id: payrollUid },
                });

                // Update existing record using id
                return await tx.payroll.update({
                    where: { id: existingPayroll.id },
                    data: {
                        company_id: companyId,
                        period_id: finalPeriodId || existingPayroll.period_id,
                        period_name: finalPeriodName || existingPayroll.period_name,
                        gross_salary: grossSalary,
                        total_deduction: totalDeductions,
                        net_salary: netSalary,
                        total_working_days: totalWorkingDays,
                        days_worked: daysWorked,
                        days_absent: daysAbsent,
                        overtime_hours: overtimeHours,
                        overtime_rate_perhour: overtimeRatePerHour,
                        weekend: weekend,
                        salary_payment_date: paymentDate,
                        total_payable_amount: finalTotalPayable,
                        status: "GENERATED",
                        generated_at: new Date(),
                        components: {
                            create: componentsToCreate,
                        },
                    },
                    include: {
                        components: true,
                    },
                });
            });
        } else {
            savedPayroll = await prisma.$transaction(async (tx) => {
                // Secondary check inside transaction to avoid race duplicate
                const racePayroll = await tx.payroll.findFirst({
                    where: {
                        empid: String(employeeInfo.empid),
                        OR: [
                            ...(finalPeriodId ? [{ period_id: String(finalPeriodId) }] : []),
                            ...(finalPeriodName ? [{ period_name: String(finalPeriodName) }] : []),
                        ],
                    },
                });

                if (racePayroll) {
                    isUpdate = true;
                    const rUid = racePayroll.uid || crypto.randomUUID();
                    if (!racePayroll.uid) {
                        await tx.payroll.update({
                            where: { id: racePayroll.id },
                            data: { uid: rUid },
                        });
                    }
                    await tx.payroll_components.deleteMany({
                        where: { payroll_id: rUid },
                    });
                    return await tx.payroll.update({
                        where: { id: racePayroll.id },
                        data: {
                            company_id: companyId,
                            period_id: finalPeriodId || racePayroll.period_id,
                            period_name: finalPeriodName || racePayroll.period_name,
                            gross_salary: grossSalary,
                            total_deduction: totalDeductions,
                            net_salary: netSalary,
                            total_working_days: totalWorkingDays,
                            days_worked: daysWorked,
                            days_absent: daysAbsent,
                            overtime_hours: overtimeHours,
                            overtime_rate_perhour: overtimeRatePerHour,
                            weekend: weekend,
                            salary_payment_date: paymentDate,
                            total_payable_amount: finalTotalPayable,
                            status: "GENERATED",
                            generated_at: new Date(),
                            components: {
                                create: componentsToCreate,
                            },
                        },
                        include: {
                            components: true,
                        },
                    });
                }

                // Create fresh payroll record with unique cuid/uuid
                const newPayrollUid = crypto.randomUUID();

                return await tx.payroll.create({
                    data: {
                        uid: newPayrollUid,
                        empid: String(employeeInfo.empid),
                        company_id: companyId,
                        period_id: String(finalPeriodId),
                        period_name: String(finalPeriodName),
                        gross_salary: grossSalary,
                        total_deduction: totalDeductions,
                        net_salary: netSalary,
                        total_working_days: totalWorkingDays,
                        days_worked: daysWorked,
                        days_absent: daysAbsent,
                        overtime_hours: overtimeHours,
                        overtime_rate_perhour: overtimeRatePerHour,
                        weekend: weekend,
                        salary_payment_date: paymentDate,
                        total_payable_amount: finalTotalPayable,
                        status: "GENERATED",
                        generated_at: new Date(),
                        components: {
                            create: componentsToCreate,
                        },
                    },
                    include: {
                        components: true,
                    },
                });
            });
        }

        return NextResponse.json(
            {
                success: true,
                message: isUpdate
                    ? `Payroll for ${employeeUser.name} (${employeeUser.empid}) updated successfully`
                    : `Payroll for ${employeeUser.name} (${employeeUser.empid}) generated successfully`,
                data: savedPayroll,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error initiating payroll:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Failed to initiate payroll",
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

// ─── GET (Fetch Initiated Payrolls by UID, Period, PeriodId, or Empid) ────────
export async function GET(req: NextRequest) {
    const auth = await checkAuth(req, [
        PERMISSION_KEYS.PAYSLIP_VIEW
    ]);
    if ("error" in auth) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const uid = searchParams.get("uid");
        const period = searchParams.get("period");
        const periodId = searchParams.get("periodId") || searchParams.get("period_id");
        const empid = searchParams.get("empid");

        // Single record lookup by UID
        if (uid) {
            const payrollRecord = await prisma.payroll.findUnique({
                where: { uid },
                include: {
                    components: true,
                    company: {
                        select: {
                            uid: true,
                            name: true,
                            address: true,
                            email: true,
                            website: true,
                        },
                    },
                    users: {
                        select: {
                            empid: true,
                            name: true,
                            email: true,
                            position: true,
                            employee_type: true,
                            date_of_joining: true,
                            employeeProfile: {
                                select: {
                                    bank_details: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!payrollRecord) {
                return NextResponse.json(
                    { success: false, message: "Payroll record not found" },
                    { status: 404 }
                );
            }

            return NextResponse.json(
                { success: true, data: payrollRecord },
                { status: 200 }
            );
        }

        const where: any = {};
        if (periodId && period) {
            where.OR = [
                { period_id: periodId },
                { period_name: period },
            ];
        } else if (periodId) {
            where.period_id = periodId;
        } else if (period) {
            where.period_name = period;
        }
        if (empid) where.empid = empid;

        const payrollRecords = await prisma.payroll.findMany({
            where,
            include: {
                components: true,
                company: {
                    select: {
                        uid: true,
                        name: true,
                    },
                },
                users: {
                    select: {
                        empid: true,
                        name: true,
                        email: true,
                        position: true,
                    },
                },
            },
            orderBy: { generated_at: "desc" },
        });

        return NextResponse.json(
            { success: true, data: payrollRecords },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Error fetching initiated payrolls:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Failed to fetch payroll records",
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}
