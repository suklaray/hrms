import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, startDate, endDate, reason } = req.body;

  if (!email || !startDate || !endDate || !reason) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { email },
      select: { empid: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    await prisma.leave_requests.create({
      data: {
        empid: user.empid,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        reason,
      },
    });

    res.status(200).json({ message: "Leave request submitted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
