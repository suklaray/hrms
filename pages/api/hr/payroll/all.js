import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const payrolls = await prisma.payroll.findMany({
      include: {
        users: {
          select: {
            name: true,
            position: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    // Combine payroll with user info
    const formatted = payrolls.map(p => ({
      ...p,
      name: p.users.name,
      position: p.users.position
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching payrolls:', error);
    res.status(500).json({ message: 'Database error' });
  }
}
