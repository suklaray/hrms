import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ---------- Config ----------
const FULL_DAY_HOURS = 8;
const HALF_DAY_MIN_HOURS = 4;
const STANDARD_MONTHLY_WORKING_DAYS = 22;

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

function toDateKey(d: Date): string {
  return toUTCDateOnly(d).toISOString().slice(0, 10);
}

/** Round to 2 decimals to keep DECIMAL(5,2) clean */
function round2(n: number): number {
  return Number(n.toFixed(2));
}

function classifyByHours(hours: number): {
  workingDay: number;
  isAbsent: boolean;
  overtime: number;
} {
  if (hours < HALF_DAY_MIN_HOURS) {
    return { workingDay: 0, isAbsent: true, overtime: 0 };
  }
  if (hours < FULL_DAY_HOURS) {
    return { workingDay: 0.5, isAbsent: false, overtime: 0 };
  }
  const diff = round2(hours - FULL_DAY_HOURS);
  const overtime = diff >= 1 ? diff : 0;
  return {
    workingDay: 1,
    isAbsent: false,
    overtime,
  };
}

// ---------- Handler ----------

async function handleMonthlySummary(req: NextRequest) {
  // ===== CRON SECRET BYPASS =====
  const cronSecret = req.headers.get("x-cron-secret");
  const isCronCall =
    !!cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isCronCall) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

      // Fetch user profile info
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

      // ---- Calendar Events in this month ----
      const calendarEvents = await prisma.calendar_events.findMany({
        where: {
          event_date: { gte: monthStart, lt: monthEnd },
        },
        select: { event_date: true, event_type: true },
      });

      const calendarEventsByDate = new Map<string, string>();
      for (const ev of calendarEvents) {
        const key = toDateKey(ev.event_date);
        const type = ev.event_type ? ev.event_type.trim().toLowerCase() : "";
        // If there are multiple events on the same day, prioritize holiday
        if (!calendarEventsByDate.has(key) || type === "holiday") {
          calendarEventsByDate.set(key, type);
        }
      }

      for (const empId of eligibleEmpIds) {
        let rowsToProcess: { id: number }[] = [];
        try {
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
              attendance_status: true,
              status: true,
            },
          });

          // Reset incomplete present checkins (no checkout) to PENDING
          const pendingNoCheckoutRows = attendanceRows.filter(
            (row) =>
              (row.attendance_status === "Present" ||
                row.attendance_status === "AutoCheckout") &&
              row.check_out === null
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

          // Processable rows (rows with checkout OR absent rows)
          const validAttendanceRows = attendanceRows.filter(
            (row) =>
              row.check_out !== null || row.attendance_status === "Absent"
          );

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

          // Group attendance rows by date
          const attendanceByDateMap = new Map<string, typeof attendanceRows>();
          for (const row of attendanceRows) {
            const recordDate = row.date ?? row.check_in;
            if (recordDate) {
              const key = toDateKey(recordDate);
              const list = attendanceByDateMap.get(key) ?? [];
              list.push(row);
              attendanceByDateMap.set(key, list);
            }
          }

          // ===== Leave requests for this employee in this month =====
          const empLeaveRequests = await prisma.leave_requests.findMany({
            where: {
              empid: empId,
              from_date: { lt: monthEnd },
              to_date: { gte: monthStart },
            },
            select: {
              id: true,
              from_date: true,
              to_date: true,
              status: true,
              leave_types: { select: { paid: true } },
            },
          });

          let daysWorked = 0;
          let daysAbsent = 0;
          let dailyOvertimeHours = 0;

          // ---- Day loop ----
          for (const day of daysToEvaluate) {
            const dayKey = toDateKey(day);
            const rowsForDay = attendanceByDateMap.get(dayKey) ?? [];
            const weekendDay = isWeekend(day);

            // Check if there is any Present / AutoCheckout session for this day
            const presentRows = rowsForDay.filter(
              (r) =>
                r.attendance_status === "Present" ||
                r.attendance_status === "AutoCheckout"
            );

            if (presentRows.length > 0) {
              // "If it not found check_out or as null it do not count that day."
              const hasNullCheckout = presentRows.some(
                (r) => r.check_out === null
              );
              if (hasNullCheckout) {
                continue;
              }

              let dayHours = 0;
              for (const row of presentRows) {
                if (row.total_hours !== null && row.total_hours !== undefined) {
                  dayHours += Number(row.total_hours);
                } else if (row.check_in && row.check_out) {
                  dayHours +=
                    (row.check_out.getTime() - row.check_in.getTime()) /
                    (1000 * 60 * 60);
                }
              }
              dayHours = round2(dayHours);

              // "now if the day is a weekend then also its count as weekdays logic."
              const { workingDay, isAbsent, overtime } = classifyByHours(dayHours);
              if (isAbsent) {
                daysAbsent = round2(daysAbsent + 1);
              } else {
                daysWorked = round2(daysWorked + workingDay);
                dailyOvertimeHours = round2(dailyOvertimeHours + overtime);
              }
              continue;
            }

            // Either attendance record explicitly has Absent, or there's no attendance record on this day
            const hasExplicitAbsent = rowsForDay.some(
              (r) => r.attendance_status === "Absent"
            );

            // If it's a weekend and no explicit attendance record exists, it's a regular weekend day off
            if (weekendDay && !hasExplicitAbsent) {
              continue;
            }

            // Employee is absent on this day (either explicit Absent or weekday without attendance)
            // "Now if the attendance_status is Absent then it checks for leave_requests table..."
            const leavesForDay = empLeaveRequests.filter((lv) => {
              const start = toUTCDateOnly(lv.from_date);
              const end = toUTCDateOnly(lv.to_date);
              return day >= start && day <= end;
            });

            if (leavesForDay.length > 0) {
              // Prioritize Approved, then Pending, then Rejected/Cancelled
              const approvedLeave = leavesForDay.find(
                (lv) => lv.status === "Approved"
              );
              if (approvedLeave) {
                // "if its found Approved then it checks the leave_types table, on paid column if it found 0 then that day count as absent and if it found 1 then it count as present."
                const isPaid = !!approvedLeave.leave_types?.paid;
                if (isPaid) {
                  daysWorked = round2(daysWorked + 1);
                } else {
                  daysAbsent = round2(daysAbsent + 1);
                }
              } else {
                const pendingLeave = leavesForDay.find(
                  (lv) => lv.status === "Pending"
                );
                if (pendingLeave) {
                  // "if it found Pending then it do not count that day"
                  // Do not count that day
                } else {
                  // All leaves on this day are Rejected or Cancelled
                  // "if its found Rejected or Cancelled it count that day as absent"
                  daysAbsent = round2(daysAbsent + 1);
                }
              }
              continue;
            }

            // If no leave found:
            // "If it do not found any leave then it checks the calender_events for that day..."
            if (calendarEventsByDate.has(dayKey)) {
              const eventType = calendarEventsByDate.get(dayKey) ?? "";
              if (eventType === "holiday") {
                // "if it found holiday or Holiday on that column then it count that day as normal whole day"
                daysWorked = round2(daysWorked + 1);
              } else {
                // "if it found event for now count that day as absent (latter I will fix the calender_events table to support individual employee support but for now just do this)"
                daysAbsent = round2(daysAbsent + 1);
              }
              continue;
            }

            // If no calendar event either:
            // Weekday unexcused absence
            if (!weekendDay) {
              daysAbsent = round2(daysAbsent + 1);
            }
          }

          // "Then its check if the days_worked if grater than 22 then its count that as overtime, like if its half day then 4 added to overtime, if full day 8 added to overtime (eg: 22.5 marked as half day, 23 marked as full day)."
          let totalOvertimeHours = dailyOvertimeHours;
          if (daysWorked > STANDARD_MONTHLY_WORKING_DAYS) {
            const extraDays = round2(daysWorked - STANDARD_MONTHLY_WORKING_DAYS);
            const extraOvertime = round2(extraDays * FULL_DAY_HOURS);
            totalOvertimeHours = round2(totalOvertimeHours + extraOvertime);
            daysWorked = STANDARD_MONTHLY_WORKING_DAYS;
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
              days_worked: new Prisma.Decimal(round2(daysWorked)),
              days_absent: new Prisma.Decimal(round2(daysAbsent)),
              overtime_hours: new Prisma.Decimal(round2(totalOvertimeHours)),
              weekend: totalWeekends,
            },
            create: {
              empid: empId,
              month,
              year,
              total_working_days: totalWorkingDays,
              days_worked: new Prisma.Decimal(round2(daysWorked)),
              days_absent: new Prisma.Decimal(round2(daysAbsent)),
              overtime_hours: new Prisma.Decimal(round2(totalOvertimeHours)),
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
