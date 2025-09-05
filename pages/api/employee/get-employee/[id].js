import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Employee ID is required' });
  }

  try {
    const user = await prisma.users.findFirst({
      where: { empid: id },
      select: {
        empid: true,
        name: true,
        email: true,
        status: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check if user is inactive
    if (user.status === "Inactive") {
      return res.status(403).json({ error: 'Access denied. Employee is inactive.' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}