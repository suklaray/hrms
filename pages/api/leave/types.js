// pages/api/leave/types.js
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    const rows = await prisma.leave_types.findMany({
      select: {
        id: true,
        type_name: true,
      },
    });

    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
}
