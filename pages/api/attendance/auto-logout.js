import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find attendance records that are still checked in but older than 24 hours
    const overdueAttendance = await prisma.attendance.findMany({
      where: {
        check_in: {
          lt: twentyFourHoursAgo
        },
        check_out: null
      }
    });

    if (overdueAttendance.length > 0) {
      // Auto checkout these records with proper checkout time (24 hours after check-in)
      for (const record of overdueAttendance) {
        const checkoutTime = new Date(new Date(record.check_in).getTime() + 24 * 60 * 60 * 1000);
        const totalHours = 24; // Exactly 24 hours
        
        await prisma.attendance.update({
          where: { id: record.id },
          data: {
            check_out: checkoutTime,
            total_hours: totalHours,
            attendance_status: "Present"
          }
        });
      }

      res.status(200).json({ 
        message: `Auto-checkout completed for ${overdueAttendance.length} records`,
        checkedOutCount: overdueAttendance.length
      });
    } else {
      res.status(200).json({ 
        message: "No overdue attendance records found",
        checkedOutCount: 0
      });
    }
  } catch (error) {
    console.error("Auto-checkout error:", error);
    res.status(500).json({ error: "Auto-checkout failed", details: error.message });
  }
}