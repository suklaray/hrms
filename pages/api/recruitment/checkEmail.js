import prisma from '../../../lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const [existingCandidate, existingUser, existingEmployee] = await Promise.all([
      prisma.candidates.findFirst({ where: { email: email } }),
      prisma.users.findFirst({ where: { email: email } }),
      prisma.employees.findFirst({ where: { email: email } })
    ]);

    const exists = !!(existingCandidate || existingUser || existingEmployee);
    res.status(200).json({ exists });
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ error: 'Failed to check email' });
  } finally {
    await prisma.$disconnect();
  }
}