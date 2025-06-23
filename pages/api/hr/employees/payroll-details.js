import prisma from "@/lib/prisma";


export default async function handler(req, res) {
  const { empid } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!empid) {
    return res.status(400).json({ message: 'Employee ID is required' });
  }

  try {
    const employee = await prisma.users.findUnique({
      where: { empid },
      select: {
        empid: true,
        name: true,
        email: true,
        contact_number: true,
        role: true,
        position: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.status(200).json(employee);
  } catch (error) {
    console.error('Error fetching employee details:', error);
    res.status(500).json({ message: 'Database error' });
  }
}
