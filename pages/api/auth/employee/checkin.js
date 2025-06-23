import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { empid } = req.body;

  try {
    await prisma.attendance.create({
      data: {
        empid,
        check_in: new Date(),
      },
    });
    res.status(200).json({ message: "Check-in recorded" });
  } catch (err) {
    res.status(500).json({ error: "Check-in failed", details: err.message });
  }
}
