import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { empid } = req.body;

  try {
    // Use Prisma transaction to ensure both actions succeed together
    await prisma.$transaction([
      prisma.users.update({
        where: { empid },
        data: { status: "Logged In" },
      }),
      prisma.attendance.create({
        data: {
          empid,
          check_in: new Date(), // this is equivalent to NOW()
        },
      }),
    ]);

    res.status(200).json({ message: "Check-in successful" });
  } catch (err) {
    console.error("Check-in failed:", err);
    res.status(500).json({ error: "Check-in failed", details: err.message });
  }
}
