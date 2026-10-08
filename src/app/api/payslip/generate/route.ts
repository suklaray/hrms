import { checkAuth } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { calculateSalaryBreakdown } from "@/lib/salaryCalculation";
import { NextRequest, NextResponse } from "next/server";

function calculatePayableAmount({ totalWorkingDays, weekends, daysWorked, netSalary }: {
    totalWorkingDays: number;
    weekends: number;
    daysWorked: number;
    netSalary: number;
}) {
    if (!totalWorkingDays || !weekends || !daysWorked || !netSalary) return 0;
    const daysInMonth = totalWorkingDays + weekends;
    const amount = Number((netSalary / daysInMonth) * daysWorked);
    return parseFloat(amount.toFixed(2));
}

// ─── POST (Generate Payslip / Fetch Payslip Data) ─────────────────────────────
export async function POST(req: NextRequest) {
    const auth = await checkAuth(req, [PERMISSION_KEYS.PAYSLIP_GENERATE]);
    if ("error" in auth) return auth.error;

    try {
        const body = await req.json();
        const { periodId, empId } = body;

        if (!periodId) {
            return NextResponse.json({ error: "Period ID is required" }, { status: 400 });
        }

        if (!empId) {
            return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
        }

        // 1. Fetch Payroll Period
        const payrollPeriod = await prisma.payroll_period.findUnique({
            where: {
                uid: periodId,
            },
            include: {
                company: true,
                financial_year: true,
                payroll_configuration: true,
            },
        });

        if (!payrollPeriod) {
            return NextResponse.json({ error: "Payroll Period not found" }, { status: 404 });
        }

        // 2. Fetch Employee by empid, uid, or numeric id
        const periodStart = new Date(payrollPeriod.period_start);
        periodStart.setUTCHours(0, 0, 0, 0);

        const periodEnd = new Date(payrollPeriod.period_end);
        periodEnd.setUTCHours(23, 59, 59, 999);

        const numericEmpId = Number(empId);
        const employee = await prisma.users.findFirst({
            where: {
                OR: [
                    { empid: String(empId) },
                    { uid: String(empId) },
                    ...(Number.isInteger(numericEmpId) && !isNaN(numericEmpId) ? [{ id: numericEmpId }] : []),
                ],
            },
            select: {
                id: true,
                uid: true,
                empid: true,
                name: true,
                email: true,
                position: true,
                employee_type: true,
                leave_requests: {
                    where: {
                        from_date: { lte: periodEnd },
                        to_date: { gte: periodStart },
                    },
                    select: {
                        uid: true,
                        from_date: true,
                        to_date: true,
                        applied_at: true,
                        reason: true,
                        leave_type: true,
                        resoan_to_reject: true,
                        reason_to_cancel: true,
                        leave_types: {
                            select: {
                                type_name: true,
                                paid: true
                            },
                        },
                        attachment: true,
                        status: true,
                    },
                    orderBy: {
                        from_date: "asc",
                    },
                },
                company: {
                    select: {
                        uid: true,
                        name: true,
                        address: true,
                        city: true,
                        state: true,
                        pinCode: true,
                        phone: true,
                        email: true,
                        cin: true,
                        pan: true,
                        gstin: true,
                    }
                },
                date_of_joining: true,
                is_active: true,
                status: true,
                rbacRole: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                employeeProfile: {
                    select: {
                        name: true,
                        bank_details: {
                            select: {
                                account_holder_name: true,
                                bank_name: true,
                                branch_name: true,
                                account_number: true,
                                ifsc_code: true,
                                checkbook_document: true,
                            },
                        },
                    },
                },
            },
        });

        if (!employee) {
            return NextResponse.json({ error: `Employee not found for identifier: ${empId}` }, { status: 404 });
        }

        // Check if employee is inactive
        if (employee.is_active === "INACTIVE" || employee.is_active !== "ACTIVE" || employee.status?.toLowerCase() === "inactive") {
            return NextResponse.json({ error: `Employee is inactive for identifier: ${empId}` }, { status: 400 });
        }

        // 3. Derive Period Month and Year from period_start (NOT salary_payment_date!)
        // Note: salary_payment_date is when payment occurs (often next month), whereas
        // period_start represents the actual payroll/attendance month.
        const periodStartDate = new Date(payrollPeriod.period_start);
        const year = periodStartDate.getUTCFullYear();
        const month = periodStartDate.getUTCMonth() + 1;

        console.log(`[Payslip Generate] Employee: ${employee.empid}, Period: ${payrollPeriod.period_name}, Month: ${month}, Year: ${year}`);

        // 4. Fetch Attendance Monthly Summary
        const attendance = await prisma.monthlySummary.findFirst({
            where: {
                empid: employee.empid,
                month: month,
                year: year,
            },
        });

        // 5. Fetch Salary Structure & Components for Employee
        // Relationships queried:
        // - employee_salary_structure (links employee_id to salary_structure & financial_year)
        // - employee_salary_component (assigned component values for this employee)
        // - salary_structure (master structure definition)
        // - employee_salary_structure_component (structure template components & calculation rules)
        // - salary_component (component metadata: BASIC, HRA, PF, etc.)
        const employeeSalaryStructure = await prisma.employee_salary_structure.findFirst({
            where: {
                employee_id: employee.empid,
                OR: [
                    { financial_year_id: payrollPeriod.financial_year_id },
                    { status: "ACTIVE" },
                ],
                status: "ACTIVE",
            },
            include: {
                salaryStructure: {
                    include: {
                        components: {
                            include: {
                                salaryComponent: true,
                                baseComponent: true,
                            },
                            orderBy: { sequence: "asc" },
                        },
                    },
                },
                components: {
                    include: {
                        salaryComponent: true,
                    },
                },
                financialYear: true,
            },
            orderBy: { createdAt: "desc" },
        });

        // 6. Compute Salary Components & Totals
        let salaryData = null;

        if (employeeSalaryStructure) {
            const structure = employeeSalaryStructure.salaryStructure;
            const assignedComponents = employeeSalaryStructure.components;

            const earnings: Array<{
                id: number;
                componentId: number;
                code: string;
                name: string;
                type: string;
                amount: number;
                calculation_type: string;
                formula?: string | null;
            }> = [];

            const deductions: Array<{
                id: number;
                componentId: number;
                code: string;
                name: string;
                type: string;
                amount: number;
                calculation_type: string;
                formula?: string | null;
            }> = [];

            let grossSalary = 0;
            let totalDeductions = 0;

            if (assignedComponents && assignedComponents.length > 0) {
                // Use assigned employee_salary_component values
                for (const comp of assignedComponents) {
                    const amount = Number(comp.amount) || 0;
                    const item = {
                        id: comp.id,
                        componentId: comp.salary_component_id,
                        code: comp.salaryComponent?.code || "",
                        name: comp.salaryComponent?.name || "",
                        type: comp.salaryComponent?.type || "EARNING",
                        amount: Math.round(amount * 100) / 100,
                        calculation_type: comp.salaryComponent?.calculation_type || "FIXED",
                        formula: comp.salaryComponent?.formula || null,
                    };

                    if (comp.salaryComponent?.type === "EARNING") {
                        earnings.push(item);
                        grossSalary += amount;
                    } else if (comp.salaryComponent?.type === "DEDUCTION") {
                        deductions.push(item);
                        totalDeductions += amount;
                    }
                }
            } else if (structure?.components && structure.components.length > 0) {
                // Fallback: compute dynamically using employee_salary_structure_component rules
                const componentRules = structure.components.map((c) => ({
                    salary_component_id: c.salary_component_id,
                    calculation_type: c.calculation_type as "FIXED" | "PERCENTAGE",
                    value: Number(c.value) || 0,
                    base_component_id: c.base_component_id,
                    sequence: c.sequence,
                    name: c.salaryComponent?.name,
                    code: c.salaryComponent?.code,
                    type: c.salaryComponent?.type as "EARNING" | "DEDUCTION",
                }));

                const calculated = calculateSalaryBreakdown(componentRules);
                for (const c of calculated.components) {
                    const item = {
                        id: c.salary_component_id,
                        componentId: c.salary_component_id,
                        code: c.code || "",
                        name: c.name || "",
                        type: c.type || "EARNING",
                        amount: c.amount,
                        calculation_type: c.calculation_type,
                        formula: null,
                    };
                    if (c.type === "EARNING") {
                        earnings.push(item);
                    } else {
                        deductions.push(item);
                    }
                }
                grossSalary = calculated.totalEarnings;
                totalDeductions = calculated.totalDeductions;
            }

            grossSalary = Math.round(grossSalary * 100) / 100;
            totalDeductions = Math.round(totalDeductions * 100) / 100;
            const netSalary = Math.round((grossSalary - totalDeductions) * 100) / 100;

            salaryData = {
                employeeSalaryStructureId: employeeSalaryStructure.id,
                employeeSalaryStructureUid: employeeSalaryStructure.uid,
                structureName: structure?.name || "N/A",
                structureCode: structure?.code || "N/A",
                financialYear: employeeSalaryStructure.financialYear?.name || "N/A",
                status: employeeSalaryStructure.status,
                grossSalary,
                totalDeductions,
                netSalary,
                earnings,
                deductions,
                templateComponents: structure?.components?.map((sc) => ({
                    id: sc.id,
                    componentId: sc.salary_component_id,
                    name: sc.salaryComponent?.name,
                    code: sc.salaryComponent?.code,
                    type: sc.salaryComponent?.type,
                    calculationType: sc.calculation_type,
                    value: Number(sc.value),
                    baseComponent: sc.baseComponent ? {
                        id: sc.baseComponent.id,
                        name: sc.baseComponent.name,
                        code: sc.baseComponent.code,
                    } : null,
                    sequence: sc.sequence,
                })) || [],
            };
        }

        const totalPayableAmount = calculatePayableAmount({
            totalWorkingDays: Number(attendance?.total_working_days),
            weekends: Number(attendance?.weekend),
            daysWorked: Number(attendance?.days_worked),
            netSalary: Number(salaryData?.netSalary),
        });

        return NextResponse.json(
            {
                success: true,
                message: "Employee salary calculated successfully",
                employee: {
                    id: employee.id,
                    empid: employee.empid,
                    name: employee.name,
                    email: employee.email,
                    position: employee.position,
                    employeeType: employee.employee_type,
                    dateOfJoining: employee.date_of_joining,
                    role: employee.rbacRole?.name || null,
                    employeeProfile: employee.employeeProfile,
                    company: employee.company,
                },
                period: {
                    id: payrollPeriod.id,
                    uid: payrollPeriod.uid,
                    periodName: payrollPeriod.period_name,
                    periodStart: payrollPeriod.period_start,
                    periodEnd: payrollPeriod.period_end,
                    salaryPaymentDate: payrollPeriod.salary_payment_date,
                    month,
                    year,
                    status: payrollPeriod.status,
                    financialYear: {
                        id: payrollPeriod.financial_year.id,
                        uid: payrollPeriod.financial_year.uid,
                        name: payrollPeriod.financial_year.name,
                        start_date: payrollPeriod.financial_year.start_date,
                        end_date: payrollPeriod.financial_year.end_date,
                        status: payrollPeriod.financial_year.status,
                    },
                    configuration: {
                        id: payrollPeriod.payroll_configuration.id,
                        uid: payrollPeriod.payroll_configuration.uid,
                        currency: payrollPeriod.payroll_configuration.currency,
                        payroll_cycle: payrollPeriod.payroll_configuration.payroll_cycle,
                        attendance_cut_off: payrollPeriod.payroll_configuration.attendance_cut_off,
                        leave_cut_off: payrollPeriod.payroll_configuration.leave_cut_off,
                        overtime_cut_off: payrollPeriod.payroll_configuration.overtime_cut_off,
                        working_days: payrollPeriod.payroll_configuration.working_days,
                        salary_payment_date: payrollPeriod.payroll_configuration.salary_payment_date,
                        salary_calendar: payrollPeriod.payroll_configuration.salary_calendar,
                        approval: payrollPeriod.payroll_configuration.approval,
                        status: payrollPeriod.payroll_configuration.status,
                    },
                },
                attendance: attendance
                    ? {
                        id: attendance.id,
                        uid: attendance.uid,
                        empid: attendance.empid,
                        month: attendance.month,
                        year: attendance.year,
                        totalWorkingDays: attendance.total_working_days,
                        daysWorked: Number(attendance.days_worked),
                        daysAbsent: Number(attendance.days_absent),
                        overtimeHours: Number(attendance.overtime_hours),
                        weekend: attendance.weekend,
                    }
                    : null,
                attendanceMessage: attendance
                    ? undefined
                    : "No monthly attendance record found for this period.",
                leaves: employee.leave_requests,
                salary: salaryData,
                salaryMessage: salaryData
                    ? undefined
                    : "No active salary structure found assigned to this employee.",
                totalPayableAmount: totalPayableAmount,
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("Error generating payslip:", error);
        return NextResponse.json(
            {
                message: "Error generating payslip",
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}

// GET period and configs.
export async function GET(req: NextRequest) {
    try {
        const auth = await checkAuth(req, [PERMISSION_KEYS.PAYSLIP_GENERATE]);
        if ("error" in auth) return auth.error;

        const { searchParams } = new URL(req.url);
        const periodId = searchParams.get("periodId");

        const payrollPeriod = await prisma.payroll_period.findUnique({
            where: {
                uid: periodId,
            },
            select: {
                uid: true,
                period_name: true,
                period_start: true,
                period_end: true,
                salary_payment_date: true,
                status: true,
                company: {
                    select: {
                        uid: true,
                        name: true,
                        address: true,
                        city: true,
                        state: true,
                        pinCode: true,
                        phone: true,
                        email: true,
                        website: true,
                        cin: true,
                        pan: true,
                        gstin: true,
                    },
                },
                financial_year: {
                    select: {
                        name: true,
                        start_date: true,
                        end_date: true,
                        status: true,
                    },
                },
                payroll_configuration: {
                    select: {
                        uid: true,
                        currency: true,
                        payroll_cycle: true,
                        attendance_cut_off: true,
                        leave_cut_off: true,
                        overtime_cut_off: true,
                        working_days: true,
                        salary_payment_date: true,
                        salary_calendar: true,
                        approval: true,
                        status: true,
                    },
                },
                payrolls: {
                    select: {
                        id: true,
                        uid: true,
                        empid: true,
                        period_id: true,
                        period_name: true,
                        status: true,
                        gross_salary: true,
                        total_deduction: true,
                        net_salary: true,
                        total_payable_amount: true,
                        overtime_hours: true,
                        overtime_rate_perhour: true,
                        days_worked: true,
                        days_absent: true,
                        total_working_days: true,
                        weekend: true,
                        salary_payment_date: true,
                        generated_at: true,
                        components: true,
                    },
                },
            },
        });

        if (!payrollPeriod) {
            return NextResponse.json({ message: "Payroll period not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Payroll period fetched successfully", data: payrollPeriod }, { status: 200 });

    } catch (error) {
        console.error("Error getting payslip overview:", error);
        return NextResponse.json(
            {
                message: "Error getting payslip overview",
                error: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        );
    }
}