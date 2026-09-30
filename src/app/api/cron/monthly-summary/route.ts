import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { Prisma } from "@prisma/client";

// ---------- Config ----------
const FULL_DAY_HOURS = 8;
const HALF_DAY_MIN_HOURS = 4;

// ---------- Helpers ----------

function getDaysInMonth(month: string): Date[] {
  const [y, m] = month.split("-").map(Number);
  const days: Date[] = [];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = 1; d <= last; d++) {
    days.push(new Date(Date.UTC(y, m - 1, d)));
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
  return { workingDay: 1, overtime: hours - FULL_DAY_HOURS };
}

// ---------- Route ----------

export async function POST(req: NextRequest) {
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

    let month: string;
    if (override) {
      if (!/^\d{4}-\d{2}$/.test(override)) {
        return NextResponse.json(
          { message: "Invalid `month` — expected YYYY-MM" },
          { status: 400 }
        );
      }
      month = override;
    } else {
      const now = new Date();
      const y = now.getUTCFullYear();
      const m = String(now.getUTCMonth() + 1).padStart(2, "0");
      month = `${y}-${m}`;
    }

    // Only process days up to today (UTC) when the target month is the current month.
    const allDays = getDaysInMonth(month);
    const now = new Date();
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const currentMonthKey = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1
    ).padStart(2, "0")}`;

    const days =
      month === currentMonthKey
        ? allDays.filter((d) => d <= todayUTC)
        : allDays;

    if (days.length === 0) {
      return NextResponse.json({
        success: true,
        month,
        note: "No days to process yet for this month",
        processed: 0,
      });
    }

    const monthStart = days[0];
    const monthEnd = new Date(
      Date.UTC(
        days[days.length - 1].getUTCFullYear(),
        days[days.length - 1].getUTCMonth(),
        days[days.length - 1].getUTCDate() + 1
      )
    );

    // Active employees only
    const employees = await prisma.users.findMany({
      where: { status: "Active" },
      select: { empid: true, email: true },
    });

    let processed = 0;
    let skipped = 0;
    const errors: { empid: string; error: string }[] = [];

    for (const emp of employees) {
      try {
        let workingDay = new Prisma.Decimal(0);
        let overtime = new Prisma.Decimal(0);
        let weekend = 0;

        // ---- Attendance ----
        const attendanceRows = await prisma.attendance.findMany({
          where: {
            empid: emp.empid,
            date: { gte: monthStart, lt: monthEnd },
          },
          select: { date: true, total_hours: true },
        });

        const attendanceByDate = new Map<string, number>();
        for (const row of attendanceRows) {
          if (row.date) {
            const key = toUTCDateOnly(row.date).toISOString().slice(0, 10);
            attendanceByDate.set(
              key,
              row.total_hours ? Number(row.total_hours) : 0
            );
          }
        }

        // ---- Approved regularizations (override attendance) ----
        const regularizations = await prisma.attendance_regularization.findMany({
          where: {
            empid: emp.empid,
            status: "APPROVED",
            attendance_date: { gte: monthStart, lt: monthEnd },
          },
          select: {
            attendance_date: true,
            check_in_time: true,
            requested_checkout: true,
            reviewed_at: true,
          },
          orderBy: { reviewed_at: "desc" },
        });

        const regularizationByDate = new Map<string, number>();
        for (const r of regularizations) {
          const key = toUTCDateOnly(r.attendance_date).toISOString().slice(0, 10);
          if (regularizationByDate.has(key)) continue; // keep latest reviewed_at
          const hours =
            (r.requested_checkout.getTime() - r.check_in_time.getTime()) /
            (1000 * 60 * 60);
          if (hours > 0) {
            regularizationByDate.set(key, Number(hours.toFixed(2)));
          }
        }

        // ---- Holidays ----
        const holidayEvents = await prisma.calendar_events.findMany({
          where: {
            event_type: "holiday",
            event_date: { gte: monthStart, lt: monthEnd },
          },
          select: { event_date: true, visible_to: true },
        });

        const holidayDatesForEmp = new Set<string>();
        for (const ev of holidayEvents) {
          if (!ev.visible_to) continue;
          const matches =
            ev.visible_to === "all" ||
            ev.visible_to
              .split(",")
              .map((s) => s.trim())
              .includes(emp.email);
          if (matches) {
            holidayDatesForEmp.add(
              toUTCDateOnly(ev.event_date).toISOString().slice(0, 10)
            );
          }
        }

        // ---- Day loop ----
        for (const day of days) {
          const dayKey = day.toISOString().slice(0, 10);

          // Regularization wins over raw attendance for the same day
          const regularizedHours = regularizationByDate.get(dayKey);
          const rawHours = attendanceByDate.get(dayKey) ?? 0;
          const hours =
            regularizedHours !== undefined ? regularizedHours : rawHours;

          const worked = hours > 0;
          const weekendDay = isWeekend(day);
          const holiday = holidayDatesForEmp.has(dayKey);

          if (weekendDay) {
            if (worked) {
              overtime = overtime.add(new Prisma.Decimal(hours));
            } else {
              weekend += 1;
            }
            continue;
          }

          if (holiday) {
            workingDay = workingDay.add(new Prisma.Decimal(1));
            if (worked) {
              overtime = overtime.add(new Prisma.Decimal(hours));
            }
            continue;
          }

          const { workingDay: wd, overtime: ot } = classifyByHours(hours);
          workingDay = workingDay.add(new Prisma.Decimal(wd));
          overtime = overtime.add(new Prisma.Decimal(ot));
        }

        await prisma.monthlySummary.upsert({
          where: { empid_month: { empid: emp.empid, month } },
          update: { workingDay, overtime, weekend },
          create: {
            uid: `ms_${emp.empid}_${month}`,
            empid: emp.empid,
            month,
            workingDay,
            overtime,
            weekend,
          },
        });

        processed++;
      } catch (err: any) {
        console.error(`Monthly summary failed for empid=${emp.empid}:`, err);
        errors.push({ empid: emp.empid, error: err?.message ?? "unknown" });
      }
    }

    return NextResponse.json({
      success: true,
      month,
      daysProcessed: days.length,
      totalEmployees: employees.length,
      processed,
      skipped,
      failed: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Monthly summary cron error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}