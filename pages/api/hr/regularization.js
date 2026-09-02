import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { checkPermission, isSuperAdmin } from '@/lib/rbac';
import { PERMISSION_KEYS } from '@/lib/rbacPermissions';

function getUserFromToken(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.token;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const user = getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.ATTENDANCE_REGULARIZE_APPROVE) || await checkPermission(user, PERMISSION_KEYS.ATTENDANCE_REGULARIZE);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  }

  // GET - list all regularization requests
  if (req.method === 'GET') {
    try {
      const { status = 'PENDING', empid } = req.query;

      const where = {};
      if (status !== 'all') where.status = status;
      if (empid) {
        where.empid = empid;
      } else if (!isSuperAdmin(user)) {
        where.NOT = { empid: user.empid };
      }

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
      if (request.empid === user.empid && !isSuperAdmin(user)) {
        return res.status(403).json({ error: 'You cannot approve or reject your own regularization request' });
      }

      if (action === 'APPROVED') {
        const checkIn = new Date(request.check_in_time);
        const checkOut = new Date(request.requested_checkout);
        const totalSeconds = (checkOut - checkIn) / 1000;
        const totalHours = parseFloat((totalSeconds / 3600).toFixed(2));
        const attendanceStatus = totalSeconds >= 14400 ? 'Present' : 'Absent';
        let attendanceId = request.attendance_id;
        if (attendanceId) {
          // Attendance row already exists
          await prisma.attendance.update({
            where: { id: attendanceId },
            data: {
              check_in: checkIn,
              check_out: checkOut,
              total_hours: totalHours,
              attendance_status: attendanceStatus,
            },
          });
        } else {
          // Attendance row doesn't exist -> create one
          const attendance = await prisma.attendance.create({
            data: {
              empid: request.empid,
              date: new Date(request.attendance_date),
              check_in: checkIn,
              check_out: checkOut,
              total_hours: totalHours,
              attendance_status: attendanceStatus,
            },
          });

          attendanceId = attendance.id;

          // Save the newly created attendance id back into the regularization record
          await prisma.attendance_regularization.update({
            where: { id: request.id },
            data: {
              attendance_id: attendanceId,
            },
          });
        }
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
