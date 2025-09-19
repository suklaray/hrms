import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from '@/lib/prisma';

export default async function handler(req, res) {
  try {
    const { token } = cookie.parse(req.headers.cookie || '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: { empid: true, role: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const { employeeId } = req.query;
      
      if (!employeeId) {
        return res.status(400).json({ error: 'Employee ID is required' });
      }

      if (user.role === 'employee' && user.empid !== employeeId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      //console.log('Searching for tasks with assigned_to:', employeeId);

      // First, let's check if tasks exist at all
      const allTasks = await prisma.tasks.findMany({
        select: { id: true, assigned_to: true, title: true }
      });
      //console.log('All tasks in database:', allTasks);

      // Now get tasks for this employee
      const tasks = await prisma.tasks.findMany({
        where: { assigned_to: employeeId },
        select: {
          id: true,
          title: true,
          description: true,
          assigned_to: true,
          assigned_by: true,
          deadline: true,
          priority: true,
          status: true,
          created_at: true,
          updated_at: true
        },
        orderBy: { created_at: 'desc' }
      });

      //console.log('Tasks found for employee:', tasks);

      // Get creator names separately
      const tasksWithCreator = await Promise.all(
        tasks.map(async (task) => {
          const creator = await prisma.users.findUnique({
            where: { empid: task.assigned_by },
            select: { name: true }
          });
          return {
            ...task,
            creator_name: creator?.name || 'Unknown'
          };
        })
      );

      return res.status(200).json({ tasks: tasksWithCreator });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Employee tasks API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
