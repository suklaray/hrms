// pages/api/task-management/user-task.js
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const { token } = cookies;
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: { empid: true, role: true, name: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (req.method === 'GET') {
      // Get tasks assigned to current user
      const tasks = await prisma.tasks.findMany({
        where: { assigned_to: user.empid },
        orderBy: { created_at: 'desc' }
      });

      // Get assigned by user names separately
      const tasksWithAssigner = await Promise.all(
        tasks.map(async (task) => {
          const assigner = await prisma.users.findUnique({
            where: { empid: task.assigned_by },
            select: { name: true, empid: true }
          });
          return {
            ...task,
            assignedBy: assigner
          };
        })
      );

      return res.status(200).json({ tasks: tasksWithAssigner });
    }

    if (req.method === 'PUT') {
      // Update task status
      const { taskId, status } = req.body;
      
      if (!taskId || !status) {
        return res.status(400).json({ error: 'Task ID and status are required' });
      }

      // Verify task belongs to user
      const task = await prisma.tasks.findFirst({
        where: { 
          id: parseInt(taskId),
          assigned_to: user.empid 
        }
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const updatedTask = await prisma.tasks.update({
        where: { id: parseInt(taskId) },
        data: { status }
      });

      return res.status(200).json({ message: 'Task status updated', task: updatedTask });
    }

    return res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('User task API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
