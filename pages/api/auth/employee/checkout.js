import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { empid } = req.body;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const attendance = await prisma.attendance.findFirst({
      where: {
        empid,
        date: {
          gte: today,
        },
      },
    });

    if (!attendance?.check_in) {
      return res.status(400).json({ error: "Not checked in yet." });
    }

    if (attendance.check_out) {
      return res.status(400).json({ error: "Already checked out." });
    }

    const checkOutTime = new Date();
    const diffMs = checkOutTime - new Date(attendance.check_in);
    const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

    await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        check_out: checkOutTime,
        total_hours: diffHours,
      },
    });

    res.status(200).json({
      message: "Checked out successfully",
      hours: diffHours,
    });
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({ error: "Checkout failed" });
  }
}
