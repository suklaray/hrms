import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body;

  try {
    const user = await prisma.users.findUnique({
      where: { email },
      select: { empid: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const requests = await prisma.leave_requests.findMany({
      where: { empid: user.empid },
      orderBy: { created_at: "desc" },
      select: {
        start_date: true,
        end_date: true,
        reason: true,
        status: true,
      },
    });

    const leaveStatus = requests.map((req) => ({
      date: `${req.start_date} to ${req.end_date}`,
      reason: req.reason,
      status: req.status,
    }));

    res.status(200).json({ leaveStatus });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leave status" });
  }
}
