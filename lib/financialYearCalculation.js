export default function getFinancialYear(startMonth, endMonth) {
    // Validate format: YYYY-MM
    const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

    if (!monthRegex.test(startMonth)) {
        throw new Error(
            `Invalid financial year start month: "${startMonth}". Expected format YYYY-MM.`
        );
    }

    if (!monthRegex.test(endMonth)) {
        throw new Error(
            `Invalid financial year end month: "${endMonth}". Expected format YYYY-MM.`
        );
    }

    // Extract year and month
    const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
    const [endYear, endMonthNumber] = endMonth.split("-").map(Number);

    // Convert YYYY-MM into a comparable month index
    const startIndex = startYear * 12 + (startMonthNumber - 1);
    const endIndex = endYear * 12 + (endMonthNumber - 1);

    // End must be after start
    if (endIndex <= startIndex) {
        throw new Error(
            `Invalid financial year range: "${startMonth}" to "${endMonth}". End month must be after start month.`
        );
    }

    // A financial year should normally be exactly 12 months
    if (endIndex - startIndex !== 11) {
        throw new Error(
            `Invalid financial year range: "${startMonth}" to "${endMonth}". Financial year must contain exactly 12 months.`
        );
    }

    return `FY ${startYear}-${String(endYear).slice(-2)}`;
}