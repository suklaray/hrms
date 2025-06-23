// pages/api/leave/status.js
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const { empid } = req.query;

  try {
    const rows = await prisma.leave_requests.findMany({
      where: { empid: empid },
      select: {
        leave_type: true,
        from_date: true,
        to_date: true,
        status: true,
      },
    });

    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}
