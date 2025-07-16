import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { empid } = req.body;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const existing = await prisma.attendance.findFirst({
      where: {
        empid,
        date: {
          gte: today,
        },
      },
    });

    if (existing?.check_in) {
      return res.status(400).json({ error: "Already checked in today." });
    }

    await prisma.attendance.create({
      data: {
        empid,
        check_in: new Date(),
        attendance_status: "Present",
      },
    });

    res.status(200).json({ message: "Checked in successfully" });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ error: "Check-in failed" });
  }
}
