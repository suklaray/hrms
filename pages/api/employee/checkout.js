import prisma from "@/lib/prisma";


export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { empid } = req.body;

  try {
    await prisma.$transaction([
      prisma.users.update({
        where: { empid },
        data: { status: "Logged Out" },
      }),
      prisma.attendance.updateMany({
        where: {
          empid,
          check_out: null,
        },
        data: {
          check_out: new Date(),
        },
      }),
    ]);

    res.status(200).json({ message: "Check-out successful" });
  } catch (err) {
    res.status(500).json({ error: "Check-out failed", details: err.message });
  }
}
