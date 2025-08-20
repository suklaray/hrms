import prisma from "@/lib/prisma";
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  try {
    if (req.method === 'POST' || req.method === 'PUT') {
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (!['hr', 'admin', 'superadmin'].includes(decoded.role)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    if (req.method === 'GET') {
      const leaveTypes = await prisma.leave_types.findMany({
        orderBy: { id: 'asc' }
      });
      return res.status(200).json({ success: true, data: leaveTypes });
    }

    if (req.method === 'POST') {
      const { type_name, max_days, paid } = req.body;
      
      if (!type_name || !max_days) {
        return res.status(400).json({ success: false, message: 'Type name and max days are required' });
      }

      const newLeaveType = await prisma.leave_types.create({
        data: {
          type_name,
          max_days: parseInt(max_days),
          paid: paid === true || paid === 'true'
        }
      });

      return res.status(201).json({ success: true, data: newLeaveType });
    }

    if (req.method === 'PUT') {
      const { id, type_name, max_days, paid } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, message: 'ID is required' });
      }

      const updatedLeaveType = await prisma.leave_types.update({
        where: { id: parseInt(id) },
        data: {
          type_name,
          max_days: parseInt(max_days),
          paid: paid === true || paid === 'true'
        }
      });

      return res.status(200).json({ success: true, data: updatedLeaveType });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Leave types API error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}