/**
 * Calculates the end month (YYYY-MM) for the financial year that startMonth belongs to.
 * In the standard April to March financial year:
 * - Months April (04) to December (12) belong to FY startYear-(startYear+1), ending in March of next year.
 * - Months January (01) to March (03) belong to FY (startYear-1)-startYear, ending in March of current year.
 */
export function getFinancialYearEndMonth(startMonth: string): string {
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!monthRegex.test(startMonth)) {
        throw new Error(
            `Invalid financial year start month: "${startMonth}". Expected format YYYY-MM.`
        );
    }

    const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
    const endYear = startMonthNumber >= 4 ? startYear + 1 : startYear;
    return `${endYear}-03`;
}

export default function getFinancialYear(startMonth: string, endMonth?: string): string {
    // Validate format: YYYY-MM
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

    if (!monthRegex.test(startMonth)) {
        throw new Error(
            `Invalid financial year start month: "${startMonth}". Expected format YYYY-MM.`
        );
    }

    const [startYear, startMonthNumber] = startMonth.split("-").map(Number);

    if (endMonth) {
        if (!monthRegex.test(endMonth)) {
            throw new Error(
                `Invalid financial year end month: "${endMonth}". Expected format YYYY-MM.`
            );
        }

        const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
        const startIndex = startYear * 12 + (startMonthNumber - 1);
        const endIndex = endYear * 12 + (endMonthNumber - 1);

        // End month cannot be before start month
        if (endIndex < startIndex) {
            throw new Error(
                `Invalid financial year range: "${startMonth}" to "${endMonth}". End month must be after start month.`
            );
        }

        // Financial year range cannot exceed 12 months
        if (endIndex - startIndex > 11) {
            throw new Error(
                `Invalid financial year range: "${startMonth}" to "${endMonth}". Financial year cannot exceed 12 months.`
            );
        }
    }

    // Determine financial year based on standard April-March cycle
    const fyStartYear = startMonthNumber >= 4 ? startYear : startYear - 1;
    const fyEndYear = fyStartYear + 1;

    return `FY ${fyStartYear}-${String(fyEndYear).slice(-2)}`;
}