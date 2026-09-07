import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export default async function handler(req, res) {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const { token } = cookies;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: { empid: true, role: true, name: true }
    });
    if (!user) return res.status(401).json({ error: 'User not found' });

    if (req.method === 'GET') {
      const canAccess = (await checkPermission(decoded, PERMISSION_KEYS.TASK_CREATE))
        || (await checkPermission(decoded, PERMISSION_KEYS.TASK_VIEW));
      if (!canAccess) return res.status(403).json({ error: 'Forbidden: insufficient permissions' });

      const employees = await prisma.users.findMany({
        where: { status: { not: 'Inactive' } },
        select: { empid: true, name: true, email: true, role: true, employee_type: true, position: true },
        orderBy: { name: 'asc' }
      });
      return res.status(200).json({ employees });
    }

    if (req.method === 'POST') {
      const canCreate = await checkPermission(decoded, PERMISSION_KEYS.TASK_CREATE);
      if (!canCreate) return res.status(403).json({ error: 'Forbidden: insufficient permissions' });

      const { title, description, assigned_to, priority, deadline } = req.body;
      if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
      if (!assigned_to?.trim()) return res.status(400).json({ error: 'Assigned to is required' });
      if (!priority) return res.status(400).json({ error: 'Priority is required' });
      if (!deadline) return res.status(400).json({ error: 'Deadline is required' });

      const deadlineDate = new Date(deadline + '+05:30');
      if (isNaN(deadlineDate.getTime())) return res.status(400).json({ error: 'Invalid deadline format' });

      const assignedUser = await prisma.users.findUnique({
        where: { empid: assigned_to },
        select: { empid: true }
      });
      if (!assignedUser) return res.status(400).json({ error: 'Assigned user not found' });

      const createdTask = await prisma.tasks.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          assigned_to,
          assigned_by: user.empid,
          priority,
          deadline: deadlineDate,
          status: 'Pending'
        }
      });
      return res.status(201).json({ message: 'Task created successfully', taskId: createdTask.id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Task management API error:', error);
    if (error.code === 'P2002') return res.status(400).json({ error: 'Database constraint violation' });
    if (error.code === 'P2025') return res.status(404).json({ error: 'Record not found' });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
