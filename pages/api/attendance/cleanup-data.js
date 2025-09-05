import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Find attendance records with unrealistic working hours (>24 hours)
    const inconsistentRecords = await prisma.attendance.findMany({
      where: {
        AND: [
          { check_in: { not: null } },
          { check_out: { not: null } },
          {
            OR: [
              { total_hours: { gt: 24 } },
              { total_hours: null }
            ]
          }
        ]
      }
    });

    let fixedCount = 0;

    for (const record of inconsistentRecords) {
      const checkIn = new Date(record.check_in);
      const checkOut = new Date(record.check_out);
      const actualHours = (checkOut - checkIn) / (1000 * 60 * 60);

      // If working hours exceed 24, cap the checkout at 24 hours after check-in
      if (actualHours > 24) {
        const cappedCheckout = new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);
        
        await prisma.attendance.update({
          where: { id: record.id },
          data: {
            check_out: cappedCheckout,
            total_hours: 24,
            attendance_status: 24 >= 4 ? "Present" : "Absent"
          }
        });
        fixedCount++;
      } else if (actualHours >= 0) {
        // Fix records with null total_hours but valid times
        await prisma.attendance.update({
          where: { id: record.id },
          data: {
            total_hours: actualHours,
            attendance_status: actualHours >= 4 ? "Present" : "Absent"
          }
        });
        fixedCount++;
      }
    }

    res.status(200).json({
      message: `Data cleanup completed. Fixed ${fixedCount} inconsistent records.`,
      totalFound: inconsistentRecords.length,
      fixedCount
    });

  } catch (error) {
    console.error("Data cleanup error:", error);
    res.status(500).json({ error: "Data cleanup failed", details: error.message });
  }
}