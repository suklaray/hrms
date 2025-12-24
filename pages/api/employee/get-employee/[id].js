import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Employee ID is required' });
  }

  try {
    // First try to get from users table
    const user = await prisma.users.findUnique({
      where: { empid: id }
    });

    if (user) {
      return res.status(200).json({
        empid: user.empid,
        name: user.name,
        email: user.email,
        form_submitted: user.form_submitted
      });
    }

    // If not found in users, return error
    return res.status(404).json({ error: 'Employee not found' });

  } catch (error) {
    console.error('Error fetching employee:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}