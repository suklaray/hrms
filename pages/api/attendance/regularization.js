import prisma from '@/lib/prisma';
import cookie from "cookie";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const { token } = cookies;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.ATTENDANCE_REGULARIZATION_CREATE);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Unauthorized: insufficient permissions' });
    }

    const { attendance_id, attendance_date, check_in_time, requested_checkout, reason } = req.body;

    // Validation
    if (!attendance_date || !check_in_time || !requested_checkout || !reason?.trim()) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (reason.trim().length > 500) {
      return res.status(400).json({ error: 'Reason cannot exceed 500 characters' });
    }

    const checkIn = new Date(check_in_time);
    const checkOut = new Date(requested_checkout);
    const attendanceDateParsed = new Date(attendance_date);

    if (checkOut <= checkIn) {
      return res.status(400).json({ error: 'Check-out time must be after check-in time' });
    }

    // Verify attendance belongs to this employee
    let attendance = null;

    if (attendance_id) {
      attendance = await prisma.attendance.findFirst({
        where: {
          id: parseInt(attendance_id),
          empid: user.empid
        }
      });

      if (!attendance) {
        return res.status(404).json({
          error: 'Attendance record not found'
        });
      }
    }

    // Check if request already exists
    const existing = await prisma.attendance_regularization.findFirst({
      where: {
        empid: user.empid,
        attendance_date: attendanceDateParsed
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Regularization request already submitted for this attendance' });
    }

    const regularization = await prisma.attendance_regularization.create({
      data: {
        attendance_id: attendance_id ? parseInt(attendance_id) : null,
        empid: user.empid,
        attendance_date: attendanceDateParsed,
        check_in_time: checkIn,
        requested_checkout: checkOut,
        reason: reason.trim(),
        status: 'PENDING'
      }
    });

    return res.status(201).json({ success: true, regularization });

  } catch (err) {
    console.error('Submit regularization error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
