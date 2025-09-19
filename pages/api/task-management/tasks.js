import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    const { token } = cookie.parse(req.headers.cookie || '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: { empid: true, role: true }
    });

    if (!user || !['hr', 'admin', 'superadmin'].includes(user.role)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

if (req.method === 'GET') {
  let whereClause = { 
    status: { not: 'inactive' },
    OR: [
      { empid: user.empid }, // Include current user
      {}
    ]
  };
  
    if (user.role === 'superadmin') {
        whereClause.OR[1] = { role: { in: ['admin', 'hr', 'employee'] } };
      } else if (user.role === 'admin') {
        whereClause.OR[1] = { role: { in: ['hr', 'employee'] } };
      } else if (user.role === 'hr') {
        whereClause.OR[1] = { role: 'employee' };
      }

      const employees = await prisma.users.findMany({
        where: whereClause,
        select: { empid: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' }
      });

      return res.status(200).json({ employees });
    }


    if (req.method === 'POST') {
      const { title, description, assigned_to, priority, deadline } = req.body;

      if (!title?.trim() || !assigned_to?.trim() || !priority || !deadline) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await prisma.tasks.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          assigned_to,
          assigned_by: user.empid,
          priority,
          deadline: new Date(deadline),
          status: 'Pending'
        }
      });

      return res.status(201).json({ message: 'Task created successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Task management API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
