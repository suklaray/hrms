import prisma from "@/lib/prisma";

export interface GeneratePayrollPeriodsInput {
    financialYear: any;
    configuration: any;
    saveToDb?: boolean;
    prismaClient?: any;
}

export interface GeneratedPeriodItem {
    period_name: string;
    period_start: Date;
    period_end: Date;
    salary_payment_date: Date | null;
}

const MONTH_NAMES_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const MONTH_NAMES_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

/**
 * Format date as DD-MMM (e.g., "01-Apr", "30-Apr")
 */
function formatShortDate(d: Date): string {
    const day = String(d.getUTCDate()).padStart(2, "0");
    const m = MONTH_NAMES_SHORT[d.getUTCMonth()];
    return `${day}-${m}`;
}

/**
 * Calculates the salary payment date for monthly cycles
 * - If salary_payment_date is >= 20 (e.g. 25, 28, 30), it falls at the end of the current period month.
 * - If salary_payment_date is < 20 (e.g. 1, 5, 7, 10), it falls in the following month.
 */
function getMonthlyPaymentDate(pEnd: Date, paymentDayConfig: number | string | undefined | null): Date | null {
    if (paymentDayConfig === undefined || paymentDayConfig === null || paymentDayConfig === "") {
        return null;
    }
    const payDay = Number(paymentDayConfig);
    if (isNaN(payDay) || payDay <= 0) return null;

    const endYear = pEnd.getUTCFullYear();
    const endMonth = pEnd.getUTCMonth();

    if (payDay >= 20) {
        const lastDayOfCurMonth = new Date(Date.UTC(endYear, endMonth + 1, 0)).getUTCDate();
        const actualDay = Math.min(payDay, lastDayOfCurMonth);
        return new Date(Date.UTC(endYear, endMonth, actualDay));
    }

    const nextMonthIndex = endMonth + 1;
    const lastDayOfNextMonth = new Date(Date.UTC(endYear, nextMonthIndex + 1, 0)).getUTCDate();
    const actualDay = Math.min(payDay, lastDayOfNextMonth);
    return new Date(Date.UTC(endYear, nextMonthIndex, actualDay));
}

/**
 * Calculates salary payment date for weekly & bi-weekly cycles
 * Typically disbursed 2-7 days after period_end
 */
function getWeeklyPaymentDate(pEnd: Date, paymentDayConfig: number | string | undefined | null): Date | null {
    if (paymentDayConfig === undefined || paymentDayConfig === null || paymentDayConfig === "") {
        return null;
    }
    const payDay = Number(paymentDayConfig);
    const delay = (!isNaN(payDay) && payDay >= 1 && payDay <= 7) ? payDay : 5;
    return new Date(Date.UTC(pEnd.getUTCFullYear(), pEnd.getUTCMonth(), pEnd.getUTCDate() + delay));
}

/**
 * Generates payroll periods between start_date and end_date of a financial year
 * based on the payroll configuration cycle and rules.
 *
 * Steps performed:
 * 1. Validate that the Financial Year belongs to the same company as the configuration.
 * 2. Check that the configuration is active.
 * 3. Check that the financial year is active/valid.
 * 4. Read payroll_cycle.
 * 5. Generate the periods between start_date and end_date (MONTHLY, WEEKLY, BI_WEEKLY).
 * 6. Gets salary_payment_date.
 * 7. Create the periods in database.
 * 8. Prevent duplicates.
 */
export async function generatePayrollPeriods({
    financialYear,
    configuration,
    saveToDb = true,
    prismaClient,
}: GeneratePayrollPeriodsInput) {
    const db = prismaClient || prisma;

    // Resolve financialYear if an ID string was passed
    let fy = financialYear;
    if (typeof fy === "string") {
        fy = await db.financial_year.findFirst({
            where: {
                OR: [{ uid: fy }, { id: isNaN(Number(fy)) ? undefined : Number(fy) }],
            },
        });
        if (!fy) {
            throw new Error(`Financial Year not found with identifier "${financialYear}"`);
        }
    }

    // Resolve configuration if an ID string was passed
    let config = configuration;
    if (typeof config === "string") {
        config = await db.payroll_configuration.findFirst({
            where: {
                OR: [{ uid: config }, { id: isNaN(Number(config)) ? undefined : Number(config) }],
            },
        });
        if (!config) {
            throw new Error(`Payroll configuration not found with identifier "${configuration}"`);
        }
    }

    if (!fy || !config) {
        throw new Error("Both financialYear and configuration are required to generate payroll periods");
    }

    // ─── 1. Validate that Financial Year belongs to same company as configuration ──
    const fyCompanyId = fy.company_id || fy.company?.uid;
    const configCompanyId = config.company_id || config.company?.uid;

    if (!fyCompanyId || !configCompanyId) {
        throw new Error("Missing company_id on financialYear or configuration");
    }

    if (fyCompanyId !== configCompanyId) {
        throw new Error(
            `Company mismatch: Financial Year belongs to company "${fyCompanyId}" while configuration belongs to "${configCompanyId}"`
        );
    }

    // ─── 2. Check that configuration is active ────────────────────────────────────
    if (config.status !== "ACTIVE") {
        throw new Error(`Payroll configuration is not active (current status: ${config.status})`);
    }

    // ─── 3. Check that financial year is active/valid ──────────────────────────────
    if (fy.status !== "ACTIVE") {
        throw new Error(`Financial Year is not active (current status: ${fy.status})`);
    }

    if (fy.lock) {
        throw new Error("Financial Year is locked. Cannot generate payroll periods for a locked financial year.");
    }

    const startDateRaw = fy.start_date;
    const endDateRaw = fy.end_date;

    if (!startDateRaw || !endDateRaw) {
        throw new Error("Financial Year must have valid start_date and end_date");
    }

    const startDate = new Date(startDateRaw);
    const endDate = new Date(endDateRaw);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid start_date or end_date in Financial Year");
    }

    if (startDate >= endDate) {
        throw new Error("Financial Year start_date must be before end_date");
    }

    // ─── 4. Read payroll_cycle ────────────────────────────────────────────────────
    const payrollCycle = (config.payroll_cycle || "").toUpperCase();
    if (!["MONTHLY", "WEEKLY", "BI_WEEKLY"].includes(payrollCycle)) {
        throw new Error(
            `Unsupported payroll cycle: "${payrollCycle}". Supported cycles are MONTHLY, WEEKLY, BI_WEEKLY.`
        );
    }

    // ─── 5 & 6. Generate the periods and get salary_payment_date ─────────────────
    const generatedPeriods: GeneratedPeriodItem[] = [];
    const paymentDayConfig = config.salary_payment_date;

    if (payrollCycle === "MONTHLY") {
        let curYear = startDate.getUTCFullYear();
        let curMonth = startDate.getUTCMonth();
        let isFirstMonth = true;

        while (true) {
            // First month respects startDate, subsequent months start on 1st
            const pStart = isFirstMonth
                ? new Date(Date.UTC(curYear, curMonth, startDate.getUTCDate()))
                : new Date(Date.UTC(curYear, curMonth, 1));

            // Last day of current month
            const endOfMonth = new Date(Date.UTC(curYear, curMonth + 1, 0));
            const pEnd = endOfMonth > endDate ? new Date(endDate) : endOfMonth;

            if (pStart > endDate) break;

            const monthName = MONTH_NAMES_FULL[curMonth];
            // Format name cleanly: "April 2024" or with date range if partial month
            const isFullMonth =
                pStart.getUTCDate() === 1 && pEnd.getUTCDate() === endOfMonth.getUTCDate();
            const period_name = isFullMonth
                ? `${monthName} ${curYear}`
                : `${monthName} ${curYear} (${formatShortDate(pStart)} → ${formatShortDate(pEnd)})`;

            const salary_payment_date = getMonthlyPaymentDate(pEnd, paymentDayConfig);

            generatedPeriods.push({
                period_name,
                period_start: pStart,
                period_end: pEnd,
                salary_payment_date,
            });

            isFirstMonth = false;
            curMonth++;
            if (curMonth > 11) {
                curMonth = 0;
                curYear++;
            }

            if (new Date(Date.UTC(curYear, curMonth, 1)) > endDate) {
                break;
            }
        }
    } else if (payrollCycle === "WEEKLY") {
        let curStart = new Date(Date.UTC(
            startDate.getUTCFullYear(),
            startDate.getUTCMonth(),
            startDate.getUTCDate()
        ));
        let weekNumber = 1;

        while (curStart <= endDate) {
            // Add 6 days for a 7-day week
            const tentativeEnd = new Date(Date.UTC(
                curStart.getUTCFullYear(),
                curStart.getUTCMonth(),
                curStart.getUTCDate() + 6
            ));
            const pEnd = tentativeEnd > endDate ? new Date(endDate) : tentativeEnd;

            const period_name = `Week ${weekNumber} (${formatShortDate(curStart)} → ${formatShortDate(pEnd)})`;
            const salary_payment_date = getWeeklyPaymentDate(pEnd, paymentDayConfig);

            generatedPeriods.push({
                period_name,
                period_start: new Date(curStart),
                period_end: pEnd,
                salary_payment_date,
            });

            // Next week starts day after pEnd
            curStart = new Date(Date.UTC(
                pEnd.getUTCFullYear(),
                pEnd.getUTCMonth(),
                pEnd.getUTCDate() + 1
            ));
            weekNumber++;
        }
    } else if (payrollCycle === "BI_WEEKLY") {
        let curStart = new Date(Date.UTC(
            startDate.getUTCFullYear(),
            startDate.getUTCMonth(),
            startDate.getUTCDate()
        ));
        let biWeekNumber = 1;

        while (curStart <= endDate) {
            // Add 13 days for a 14-day bi-week
            const tentativeEnd = new Date(Date.UTC(
                curStart.getUTCFullYear(),
                curStart.getUTCMonth(),
                curStart.getUTCDate() + 13
            ));
            const pEnd = tentativeEnd > endDate ? new Date(endDate) : tentativeEnd;

            const period_name = `Bi-Weekly ${biWeekNumber} (${formatShortDate(curStart)} → ${formatShortDate(pEnd)})`;
            const salary_payment_date = getWeeklyPaymentDate(pEnd, paymentDayConfig);

            generatedPeriods.push({
                period_name,
                period_start: new Date(curStart),
                period_end: pEnd,
                salary_payment_date,
            });

            // Next bi-week starts day after pEnd
            curStart = new Date(Date.UTC(
                pEnd.getUTCFullYear(),
                pEnd.getUTCMonth(),
                pEnd.getUTCDate() + 1
            ));
            biWeekNumber++;
        }
    }

    if (!saveToDb) {
        return {
            success: true,
            totalGenerated: generatedPeriods.length,
            createdCount: 0,
            skippedCount: 0,
            data: generatedPeriods,
        };
    }

    // ─── 7 & 8. Create the periods & Prevent duplicates ───────────────────────────
    const companyUid = fyCompanyId;
    const fyUid = fy.uid;
    const configUid = config.uid;

    // Fetch existing periods for this company and financial year
    const existingPeriods = await db.payroll_period.findMany({
        where: {
            company_id: companyUid,
            financial_year_id: fyUid,
        },
        select: {
            id: true,
            uid: true,
            period_name: true,
            period_start: true,
            period_end: true,
            salary_payment_date: true,
            status: true,
        },
    });

    // Explicitly check whether periods already exist for this financial year
    if (existingPeriods.length > 0) {
        const fyName = fy.name || "this financial year";
        return {
            success: false,
            message: `Payroll periods already generated for ${fyName}`,
            totalGenerated: generatedPeriods.length,
            createdCount: 0,
            skippedCount: existingPeriods.length,
            data: existingPeriods,
        };
    }

    const existingDateKeySet = new Set(
        existingPeriods.map((p: any) => {
            const s = p.period_start.toISOString().split("T")[0];
            const e = p.period_end.toISOString().split("T")[0];
            return `${s}_${e}`;
        })
    );

    const periodsToCreate: any[] = [];
    const skippedPeriods: any[] = [];

    for (const period of generatedPeriods) {
        const s = period.period_start.toISOString().split("T")[0];
        const e = period.period_end.toISOString().split("T")[0];
        const key = `${s}_${e}`;

        if (existingDateKeySet.has(key)) {
            skippedPeriods.push(period);
        } else {
            periodsToCreate.push({
                company_id: companyUid,
                financial_year_id: fyUid,
                payroll_configuration_id: configUid,
                period_name: period.period_name,
                period_start: period.period_start,
                period_end: period.period_end,
                salary_payment_date: period.salary_payment_date,
                status: "OPEN",
            });
            existingDateKeySet.add(key);
        }
    }

    if (periodsToCreate.length > 0) {
        await db.payroll_period.createMany({
            data: periodsToCreate,
            skipDuplicates: true,
        });
    }

    // Return all current periods ordered by period_start
    const allPeriods = await db.payroll_period.findMany({
        where: {
            company_id: companyUid,
            financial_year_id: fyUid,
        },
        orderBy: {
            period_start: "asc",
        },
    });

    return {
        success: true,
        message: `Successfully generated ${periodsToCreate.length} payroll periods (${skippedPeriods.length} existing periods skipped).`,
        totalGenerated: generatedPeriods.length,
        createdCount: periodsToCreate.length,
        skippedCount: skippedPeriods.length,
        data: allPeriods,
    };
}

export default generatePayrollPeriods;
