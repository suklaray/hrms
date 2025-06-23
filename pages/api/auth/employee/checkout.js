import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { empid } = req.body;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const latestAttendance = await prisma.attendance.findFirst({
      where: {
        empid,
        check_in: {
          gte: today,
        },
        check_out: null,
      },
      orderBy: {
        id: "desc",
      },
    });

    if (!latestAttendance) return res.status(400).json({ error: "No check-in found" });

    const checkInTime = new Date(latestAttendance.check_in);
    const checkOutTime = new Date();
    const hoursWorked = ((checkOutTime - checkInTime) / 1000 / 60 / 60).toFixed(2);

    await prisma.attendance.update({
      where: { id: latestAttendance.id },
      data: {
        check_out: checkOutTime,
        total_hours: parseFloat(hoursWorked),
      },
    });

    res.status(200).json({ message: "Check-out recorded", hours: hoursWorked });
  } catch (err) {
    res.status(500).json({ error: "Check-out failed", details: err.message });
  }
}
