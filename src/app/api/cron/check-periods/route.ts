import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
    // ===== CRON SECRET BYPASS =====
    const cronSecret = req.headers.get("x-cron-secret");
    const isCronCall =
        !!cronSecret && cronSecret === process.env.CRON_SECRET;

    if (!isCronCall) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    // ===== END CRON SECRET BYPASS =====

    // Current month calculation
    const now = new Date();

    const currentMonthIndex = now.getMonth();
    const currentYear = now.getFullYear();

    const monthNames = Array.from(
        { length: currentMonthIndex + 1 },
        (_, index) =>
            new Intl.DateTimeFormat("en-US", {
                month: "long",
            }).format(new Date(currentYear, index, 1))
    );

    const periodNames = monthNames.map(
        month => `${month} ${currentYear}`
    );


    try {
        const periods = await prisma.payroll_period.findMany({
            where: {
                period_name: {
                    in: periodNames
                },
                status: {
                    in: ["OPEN", "PROCESSING"]
                }
            },
            include: {
                payrolls: true
            }
        })

        if (periods.length === 0) {
            return NextResponse.json({ message: "No periods found" }, { status: 404 });
        }

        let hasOpenPayrolls = false;

        for (const period of periods) {
            // Check whether this period has any GENERATED payroll
            const hasGeneratedPayroll = period.payrolls.some(
                payroll => payroll.status === "GENERATED"
            );

            if (hasGeneratedPayroll) {
                hasOpenPayrolls = true;
                await prisma.payroll_period.update({
                    where: {
                        id: period.id
                    },
                    data: {
                        status: "OPEN"
                    }
                });
                // Skip this period completely
                continue;
            }

            // No GENERATED payrolls, so process this period
            if (period.payrolls.length > 0) {
                await prisma.payroll_period.update({
                    where: {
                        id: period.id
                    },
                    data: {
                        status: "COMPLETED"
                    }
                });
            }

            await prisma.payroll_period.update({
                where: {
                    id: period.id
                },
                data: {
                    status: "CLOSED"
                }
            });
        }

        // After checking ALL periods
        if (hasOpenPayrolls) {
            return NextResponse.json(
                {
                    message: "There are open payrolls on this period"
                },
                { status: 200 }
            );
        }

        return NextResponse.json({ message: "Payroll periods completed successfully", periods: periods }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}