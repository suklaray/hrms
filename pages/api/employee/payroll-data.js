import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await verifyEmployeeToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const payrolls = await prisma.payroll.findMany({
      where: { empid: user.empid },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.status(200).json(payrolls);
  } catch (error) {
    console.error('Error fetching employee payroll:', error);
    res.status(500).json({ message: 'Database error' });
  }
}