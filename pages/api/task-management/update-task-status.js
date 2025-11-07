import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const { token } = cookies;
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { taskId, status } = req.body;

    if (!taskId || !status) {
      return res.status(400).json({ error: 'Task ID and status are required' });
    }

    await prisma.tasks.update({
      where: { id: taskId },
      data: { status }
    });

    return res.status(200).json({ message: 'Task status updated successfully' });
  } catch (error) {
    console.error('Error updating task status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
