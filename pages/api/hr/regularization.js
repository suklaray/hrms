import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

function verifyHRToken(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!['hr', 'admin', 'superadmin'].includes(decoded.role)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const user = verifyHRToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // GET - list all regularization requests
  if (req.method === 'GET') {
    try {
      const { status = 'PENDING', empid } = req.query;

      const where = {};
      if (status !== 'all') where.status = status;
      if (empid) where.empid = empid;

      const requests = await prisma.attendance_regularization.findMany({
        where,
        include: {
          users: { select: { name: true, empid: true, email: true } }
        },
        orderBy: { created_at: 'desc' }
      });

      return res.status(200).json({ success: true, requests });
    } catch (err) {
      console.error('Fetch regularization error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PATCH - approve or reject
  if (req.method === 'PATCH') {
    try {
      const { id, action, rejection_reason } = req.body;

      if (!id || !['APPROVED', 'REJECTED'].includes(action)) {
        return res.status(400).json({ error: 'Invalid request' });
      }

      if (action === 'REJECTED' && !rejection_reason?.trim()) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const request = await prisma.attendance_regularization.findUnique({
        where: { id: parseInt(id) }
      });

      if (!request) return res.status(404).json({ error: 'Request not found' });
      if (request.status !== 'PENDING') {
        return res.status(400).json({ error: 'Request already processed' });
      }
      if (request.empid === user.empid) {
        return res.status(403).json({ error: 'You cannot approve or reject your own regularization request' });
      }

      if (action === 'APPROVED') {
        const checkIn = new Date(request.check_in_time);
        const checkOut = new Date(request.requested_checkout);
        const totalSeconds = (checkOut - checkIn) / 1000;
        const totalHours = parseFloat((totalSeconds / 3600).toFixed(2));
        const attendanceStatus = totalSeconds >= 14400 ? 'Present' : 'Absent';

        // Update attendance record
        await prisma.attendance.update({
          where: { id: request.attendance_id },
          data: {
            check_out: checkOut,
            check_in: checkIn,
            total_hours: totalHours,
            attendance_status: attendanceStatus
          }
        });
      }

      // Update regularization status
      const updated = await prisma.attendance_regularization.update({
        where: { id: parseInt(id) },
        data: {
          status: action,
          reviewed_by: user.empid,
          reviewed_at: new Date(),
          ...(action === 'REJECTED' && { rejection_reason: rejection_reason.trim() })
        }
      });

      return res.status(200).json({ success: true, updated });
    } catch (err) {
      console.error('Process regularization error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
