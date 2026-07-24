import prisma from "@/lib/prisma";

const isValidCheckout = (dt) => {
  if (!dt) return false;
  const d = new Date(dt);
  return !isNaN(d.getTime()) && d.getFullYear() > 1971;
};

export async function getPendingRegularization(empid) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Holidays
  const holidays = await prisma.calendar_events.findMany({
    where: { event_type: "holiday" },
    select: { event_date: true },
  });

  const holidaySet = new Set(
    holidays.map(h => new Date(h.event_date).toISOString().split("T")[0])
  );

  const isWorkingDay = (date) => {
    const day = date.getDay();
    if (day === 0 || day === 6) return false;
    return !holidaySet.has(date.toISOString().split("T")[0]);
  };

  const candidates = await prisma.attendance.findMany({
    where: {
      empid,
      check_in: { not: null },
      date: { lt: today },
    },
    orderBy: {
      date: "desc",
    },
  });

  const missedCheckout = candidates.find(
    r =>
      !isValidCheckout(r.check_out) &&
      r.date &&
      isWorkingDay(new Date(r.date))
  );

  if (!missedCheckout) {
    return null;
  }

  const existingRequest = await prisma.attendance_regularization.findFirst({
    where: {
      attendance_id: missedCheckout.id,
    },
  });

  if (existingRequest) {
    return null;
  }

  return missedCheckout;
}