import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get user from token
    const cookies = cookie.parse(req.headers.cookie || '');
    const { token } = cookies;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: { empid: true, role: true }
    });

    if (!currentUser || !['hr', 'admin', 'superadmin'].includes(currentUser.role)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Define role-based filtering
    let roleFilter = [];
    if (currentUser.role === 'hr') {
      roleFilter = ['employee'];
    } else if (currentUser.role === 'admin') {
      roleFilter = ['hr', 'employee'];
    } else if (currentUser.role === 'superadmin') {
      roleFilter = ['admin', 'hr', 'employee'];
    }

    const payrolls = await prisma.payroll.findMany({
      include: {
        users: {
          select: {
            name: true,
            email: true,
            position: true,
            status: true,
            role: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    // Filter based on role and active status
    const formatted = payrolls
      .filter(p => p.users.status !== 'Inactive' && roleFilter.includes(p.users.role))
      .map(p => ({
        ...p,
        name: p.users.name,
        email: p.users.email,
        position: p.users.position
      }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error fetching payrolls:', error);
    res.status(500).json({ message: 'Database error' });
  }
}
