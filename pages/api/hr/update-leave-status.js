import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication
  let token = null;
  if (req.headers.cookie) {
    const parsed = cookie.parse(req.headers.cookie);
    token = parsed.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let approver;
  try {
    approver = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { id, status } = req.body;

  if (!id || !status) {
    return res.status(400).json({ success: false, error: 'Missing ID or status' });
  }

  try {
    // Get the leave request to check the requester's role
    const leaveRequest = await prisma.leave_requests.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: {
          select: { role: true }
        }
      }
    });

    if (!leaveRequest) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    const requesterRole = leaveRequest.users.role;

    // Hierarchical approval validation
    if (requesterRole === 'employee') {
      // Employee leaves can be approved by HR, admin, or superadmin
      if (!['HR', 'admin', 'superadmin'].includes(approver.role)) {
        return res.status(403).json({ success: false, error: 'Insufficient permissions' });
      }
    } else if (requesterRole === 'HR') {
      // HR leaves can only be approved by admin or superadmin
      if (!['admin', 'superadmin'].includes(approver.role)) {
        return res.status(403).json({ success: false, error: 'Only admin or superadmin can approve HR leaves' });
      }
    } else if (requesterRole === 'admin') {
      // Admin leaves can only be approved by superadmin
      if (approver.role !== 'superadmin') {
        return res.status(403).json({ success: false, error: 'Only superadmin can approve admin leaves' });
      }
    }

    await prisma.leave_requests.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    res.status(200).json({ success: true, message: 'Status updated' });
  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}
