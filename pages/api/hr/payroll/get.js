import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { empid } = req.query;

  if (!empid) {
    return res.status(400).json({ message: 'Employee ID is required' });
  }

  try {
    const payrolls = await prisma.payroll.findMany({
      where: { empid },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.status(200).json(payrolls);
  } catch (error) {
    console.error('Error fetching employee payroll:', error);
    res.status(500).json({ message: 'Database error' });
  }
}
