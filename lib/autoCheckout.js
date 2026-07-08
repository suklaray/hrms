import prisma from "@/lib/prisma";

export async function runAutoCheckout() {
  const yesterday = new Date();

  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const today = new Date(yesterday);
  today.setDate(today.getDate() + 1);

  const overdueAttendance = await prisma.attendance.findMany({
    where: {
      check_in: {
        not: null,
        gte: yesterday,
        lt: today,
      },
      check_out: null,
    },
  });

  if (overdueAttendance.length === 0) {
    return {
      processedCount: 0,
    };
  }

  let processedCount = 0;

const HALF_DAY_CUTOFF_HOUR = 16; // 4 PM
const SHIFT_END_HOUR = 22; // 10 PM
const HALF_DAY_END_HOUR = 23;
const HALF_DAY_END_MINUTE = 59;

for (const record of overdueAttendance) {
  const checkInTime = new Date(record.check_in);

  let checkoutTime = new Date(checkInTime);

  if (checkInTime.getHours() >= HALF_DAY_CUTOFF_HOUR) {
    // Half-day employee
    checkoutTime.setHours(HALF_DAY_END_HOUR, HALF_DAY_END_MINUTE, 0, 0);
  } else {
    // Regular employee
    checkoutTime.setHours(SHIFT_END_HOUR, 0, 0, 0);
  }

  if (checkoutTime <= checkInTime) {
    continue;
  }

  const totalHours =
    (checkoutTime.getTime() - checkInTime.getTime()) /
    (1000 * 60 * 60).toFixed(2);

  await prisma.attendance.update({
    where: { id: record.id },
    data: {
      check_out: checkoutTime,
      total_hours: totalHours,
      attendance_status: "AutoCheckout",
    },
  });

  processedCount++;
}

  return {
    processedCount,
  };
}