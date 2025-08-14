import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'HR' && decoded.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [totalEmployees, activeEmployees, pendingLeaves, totalCandidates] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'Active' } }),
      prisma.leaveRequest.count({ where: { status: 'Pending' } }),
      prisma.candidate.count()
    ]);

    const recentEmployees = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { name: true, empid: true, role: true, createdAt: true }
    });

    const monthlyStats = await prisma.user.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 6
    });

    res.status(200).json({
      totalEmployees,
      activeEmployees,
      pendingLeaves,
      totalCandidates,
      recentEmployees,
      monthlyStats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}