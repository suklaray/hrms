// pages/api/leave/status.js
import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from '@/lib/auth';

export default async function handler(req, res) {
  // Verify JWT token and get user data
  const user = await verifyEmployeeToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const rows = await prisma.leave_requests.findMany({
      where: { empid: user.empid },
      select: {
        id: true,
        leave_type: true,
        from_date: true,
        to_date: true,
        status: true,
        reason: true,
        attachment: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}
