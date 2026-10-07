import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { checkPermission, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { Prisma } from "@prisma/client";

// ---------- Config ----------
const FULL_DAY_HOURS = 8;
const HALF_DAY_MIN_HOURS = 4;

// ---------- Helpers ----------

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let d = 1; d <= last; d++) {
    days.push(new Date(Date.UTC(year, month - 1, d)));
  }
  return days;
}

function isWeekend(date: Date): boolean {
  const dow = date.getUTCDay();
  return dow === 0 || dow === 6;
}

function toUTCDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Round to 2 decimals to keep DECIMAL(5,2) clean */
function round2(n: number): number {
  return Number(n.toFixed(2));
}

function classifyByHours(hours: number): {
  workingDay: number;
  overtime: number;
} {
  if (hours < HALF_DAY_MIN_HOURS) {
    return { workingDay: 0, overtime: 0 };
  }
  if (hours < FULL_DAY_HOURS) {
    return { workingDay: 0.5, overtime: 0 };
  }
  return {
    workingDay: 1,
    overtime: round2(hours - FULL_DAY_HOURS),
  };
}

// ---------- Handler ----------

async function handleMonthlySummary(req: NextRequest) {
  // ===== CRON SECRET BYPASS =====
  const cronSecret = req.headers.get("x-cron-secret");
  const isCronCall =
    !!cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isCronCall) {
    const { user: decoded, errorResponse } = await getAuthenticatedUser(req);
    if (errorResponse) return errorResponse;
    if (!decoded)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const canRun = await checkPermission(
      decoded,
      PERMISSION_KEYS.CALENDAR_MANAGE
    );
    if (!canRun) {
      return NextResponse.json(
        { message: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }
  }
  // ===== END CRON SECRET BYPASS =====

  try {
    const url = new URL(req.url);
    const override = url.searchParams.get("month");

    let monthsToProcess: { year: number; month: number }[] = [];

    if (override) {
      if (!/^\d{4}-\d{2}$/.test(override)) {
        return NextResponse.json(
          { message: "Invalid `month` — expected YYYY-MM" },
          { status: 400 }
        );
      }
      const [y, m] = override.split("-").map(Number);
      monthsToProcess = [{ year: y, month: m }];
    } else {
      // Traverse the attendance table and find distinct months that have attendance
      const distinctMonthRows = await prisma.$queryRaw<
        Array<{ year: number | string | bigint; month: number | string | bigint }>
      >`
        SELECT DISTINCT
          YEAR(COALESCE(\`date\`, \`check_in\`)) as year,
          MONTH(COALESCE(\`date\`, \`check_in\`)) as month
        FROM \`attendance\`
        WHERE \`date\` IS NOT NULL OR \`check_in\` IS NOT NULL
        ORDER BY year ASC, month ASC
      `;

      const monthSet = new Set<string>();
      for (const row of distinctMonthRows) {
        const y = Number(row.year);
        const m = Number(row.month);
        if (!isNaN(y) && !isNaN(m) && y > 0 && m >= 1 && m <= 12) {
          const key = `${y}-${m}`;
          if (!monthSet.has(key)) {
            monthSet.add(key);
            monthsToProcess.push({ year: y, month: m });
          }
        }
      }

      // If no attendance records exist, default to current month
      if (monthsToProcess.length === 0) {
        const now = new Date();
        monthsToProcess.push({
          year: now.getUTCFullYear(),
          month: now.getUTCMonth() + 1,
        });
      }
    }

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const monthResults = [];
    const allErrors: { empid: string; month: string; error: string }[] = [];
    let totalProcessedAcrossMonths = 0;

    for (const { year, month } of monthsToProcess) {
      const allDaysInMonth = getDaysInMonth(year, month);
      const isCurrentMonth = year === currentYear && month === currentMonth;

      // Only process days up to today (UTC) when the target month is the current month
      const daysToEvaluate = isCurrentMonth
        ? allDaysInMonth.filter((d) => d <= todayUTC)
        : allDaysInMonth;

      // Month bounds
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      const monthEnd = new Date(Date.UTC(year, month, 1));

      // Calculate total weekends and weekdays of the processed month
      const totalWeekends = allDaysInMonth.filter(isWeekend).length;
      const totalWorkingDays = allDaysInMonth.filter((d) => !isWeekend(d)).length;

      // Find employees who have attendance records in this month
      const attendanceEmpRows = await prisma.attendance.findMany({
        where: {
          OR: [
            { date: { gte: monthStart, lt: monthEnd } },
            { check_in: { gte: monthStart, lt: monthEnd } },
          ],
        },
        select: { empid: true },
        distinct: ["empid"],
      });

      const empIds = attendanceEmpRows.map((a) => a.empid);

      if (empIds.length === 0) {
        continue;
      }

      // Fetch user profile info (e.g. email for holiday matching, role/rbacRole for superadmin exclusion)
      const employees = await prisma.users.findMany({
        where: { empid: { in: empIds } },
        select: {
          empid: true,
          email: true,
          role: true,
          roleId: true,
          rbacRole: {
            select: { id: true, name: true, type: true },
          },
        },
      });
      const employeeMap = new Map(employees.map((e) => [e.empid, e]));

      const eligibleEmpIds = empIds.filter((id) => {
        const emp = employeeMap.get(id);
        return emp;
      });

      if (eligibleEmpIds.length === 0) {
        continue;
      }

      let processed = 0;
      const monthErrors: { empid: string; error: string }[] = [];

      // ---- Holidays in this month ----
      const holidayEvents = await prisma.calendar_events.findMany({
        where: {
          event_type: "holiday",
          event_date: { gte: monthStart, lt: monthEnd },
        },
        select: { event_date: true, visible_to: true },
      });

      for (const empId of eligibleEmpIds) {
        let rowsToProcess: { id: number }[] = [];
        try {
          const emp = employeeMap.get(empId) ?? { empid: empId, email: "" };

          // ---- Attendance rows for this employee in this month ----
          const attendanceRows = await prisma.attendance.findMany({
            where: {
              empid: empId,
              OR: [
                { date: { gte: monthStart, lt: monthEnd } },
                { check_in: { gte: monthStart, lt: monthEnd } },
              ],
            },
            select: {
              id: true,
              date: true,
              check_in: true,
              check_out: true,
              total_hours: true,
              status: true,
            },
          });

          // If there is no checkout, leave that data for pending and do not count
          const pendingNoCheckoutRows = attendanceRows.filter(
            (row) => row.check_out === null
          );
          const pendingToReset = pendingNoCheckoutRows.filter(
            (row) => row.status !== "PENDING"
          );
          if (pendingToReset.length > 0) {
            await prisma.attendance.updateMany({
              where: { id: { in: pendingToReset.map((r) => r.id) } },
              data: { status: "PENDING" },
            });
          }

          // Valid rows that have checkout
          const validAttendanceRows = attendanceRows.filter(
            (row) => row.check_out !== null
          );

          // If there are no valid attendance records with checkout, do not create an empty summary
          if (validAttendanceRows.length === 0) {
            continue;
          }

          // Rows to transition (those not yet PROCESSED)
          rowsToProcess = validAttendanceRows.filter(
            (row) => row.status !== "PROCESSED"
          );

          // Change status to PROCESSING before/at the time of processing
          if (rowsToProcess.length > 0) {
            await prisma.attendance.updateMany({
              where: { id: { in: rowsToProcess.map((r) => r.id) } },
              data: { status: "PROCESSING" },
            });
          }

          // Build attendance hours directly from attendance table
          const attendanceByDate = new Map<string, number>();
          for (const row of validAttendanceRows) {
            const recordDate = row.date ?? row.check_in;
            if (recordDate) {
              const key = toUTCDateOnly(recordDate).toISOString().slice(0, 10);
              let hours = 0;
              if (row.total_hours !== null && row.total_hours !== undefined) {
                hours = Number(row.total_hours);
              } else if (row.check_in && row.check_out) {
                hours =
                  (row.check_out.getTime() - row.check_in.getTime()) /
                  (1000 * 60 * 60);
              }
              const current = attendanceByDate.get(key) ?? 0;
              attendanceByDate.set(key, round2(current + hours));
            }
          }

          // ---- Holidays for this employee ----
          const holidayDatesForEmp = new Set<string>();
          for (const ev of holidayEvents) {
            if (!ev.visible_to) continue;
            const matches =
              ev.visible_to === "all" ||
              (emp.email &&
                ev.visible_to
                  .split(",")
                  .map((s) => s.trim())
                  .includes(emp.email));
            if (matches) {
              holidayDatesForEmp.add(
                toUTCDateOnly(ev.event_date).toISOString().slice(0, 10)
              );
            }
          }

          // ===== Approved paid leaves for this employee in this month =====
          const approvedLeaves = await prisma.leave_requests.findMany({
            where: {
              empid: empId,
              status: "Approved",
              from_date: { lt: monthEnd },
              to_date: { gte: monthStart },
            },
            select: {
              from_date: true,
              to_date: true,
              leave_types: { select: { paid: true } },
            },
          });

          const paidLeaveDates = new Set<string>();
          for (const lv of approvedLeaves) {
            if (!lv.leave_types?.paid) continue;
            const start = toUTCDateOnly(lv.from_date);
            const end = toUTCDateOnly(lv.to_date);
            for (
              let d = new Date(start);
              d.getTime() <= end.getTime();
              d.setUTCDate(d.getUTCDate() + 1)
            ) {
              if (d < monthStart || d >= monthEnd) continue;
              paidLeaveDates.add(d.toISOString().slice(0, 10));
            }
          }
          // ===== END LEAVE BLOCK =====

          let daysWorked = new Prisma.Decimal(0);
          let overtimeHours = new Prisma.Decimal(0);

          // ---- Day loop ----
          for (const day of daysToEvaluate) {
            const dayKey = day.toISOString().slice(0, 10);

            // Calculated solely from attendance table
            const hours = attendanceByDate.get(dayKey) ?? 0;
            const worked = hours > 0;
            const weekendDay = isWeekend(day);
            const holiday = holidayDatesForEmp.has(dayKey);
            const onPaidLeave = paidLeaveDates.has(dayKey);

            // 1. Weekend: if worked, add to overtime_hours
            if (weekendDay) {
              if (worked) {
                overtimeHours = overtimeHours.add(
                  new Prisma.Decimal(round2(hours))
                );
              }
              continue;
            }

            // 2. Holiday: counts as 1 working day; if worked, also adds to overtime_hours
            if (holiday) {
              daysWorked = daysWorked.add(new Prisma.Decimal(1));
              if (worked) {
                overtimeHours = overtimeHours.add(
                  new Prisma.Decimal(round2(hours))
                );
              }
              continue;
            }

            // 3. Paid leave — always counts as 1.0 working day.
            if (onPaidLeave) {
              daysWorked = daysWorked.add(new Prisma.Decimal(1));
            }

            // 4. Attendance contribution — runs even when on paid leave
            const { workingDay: wd, overtime: ot } = classifyByHours(hours);
            daysWorked = daysWorked.add(new Prisma.Decimal(wd));
            overtimeHours = overtimeHours.add(new Prisma.Decimal(ot));
          }

          // Upsert monthly_summary (single month record per employee, updates data as attendance changes)
          await prisma.monthlySummary.upsert({
            where: {
              empid_month: {
                empid: empId,
                month,
              },
            },
            update: {
              year,
              total_working_days: totalWorkingDays,
              days_worked: daysWorked,
              overtime_hours: overtimeHours,
              weekend: totalWeekends,
            },
            create: {
              empid: empId,
              month,
              year,
              total_working_days: totalWorkingDays,
              days_worked: daysWorked,
              overtime_hours: overtimeHours,
              weekend: totalWeekends,
            },
          });

          // Mark processed attendance records as PROCESSED
          if (rowsToProcess.length > 0) {
            await prisma.attendance.updateMany({
              where: { id: { in: rowsToProcess.map((r) => r.id) } },
              data: { status: "PROCESSED" },
            });
          }

          processed++;
          totalProcessedAcrossMonths++;
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(
            `Monthly summary failed for empid=${empId}, month=${year}-${month}:`,
            err
          );
          monthErrors.push({
            empid: empId,
            error: errorMessage,
          });
          allErrors.push({
            empid: empId,
            month: `${year}-${String(month).padStart(2, "0")}`,
            error: errorMessage,
          });

          // If error occurs, mark rows being processed as FAILED
          if (rowsToProcess.length > 0) {
            await prisma.attendance.updateMany({
              where: { id: { in: rowsToProcess.map((r) => r.id) } },
              data: { status: "FAILED" },
            });
          }
        }
      }

      monthResults.push({
        year,
        month,
        monthKey: `${year}-${String(month).padStart(2, "0")}`,
        daysProcessed: daysToEvaluate.length,
        totalWorkingDays,
        totalWeekends,
        employeesWithAttendance: eligibleEmpIds.length,
        processed,
        failed: monthErrors.length,
        errors: monthErrors.length > 0 ? monthErrors : undefined,
      });
    }

    return NextResponse.json({
      success: allErrors.length === 0,
      totalMonthsProcessed: monthResults.length,
      processedMonths: monthResults,
      totalEmployeesProcessed: totalProcessedAcrossMonths,
      failed: allErrors.length,
      errors: allErrors.length > 0 ? allErrors : undefined,
    });
  } catch (error) {
    console.error("Monthly summary cron error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handleMonthlySummary(req);
}

export async function GET(req: NextRequest) {
  return handleMonthlySummary(req);
}