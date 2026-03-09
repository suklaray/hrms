import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user has permission to view all tasks
    if (!['hr', 'admin', 'superadmin'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tasks = await prisma.tasks.findMany({
      include: {
        assignee: {
          select: {
            name: true,
            empid: true,
            email: true
          }
        },
        creator: {
          select: {
            name: true,
            empid: true,
            email: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform the data to match expected format
    const transformedTasks = tasks.map(task => ({
      ...task,
      assignedBy: task.creator
    }));

    return res.status(200).json({ tasks: transformedTasks });
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}