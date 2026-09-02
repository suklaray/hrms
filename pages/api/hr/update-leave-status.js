import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { checkPermission, isSuperAdmin } from '@/lib/rbac';
import { PERMISSION_KEYS } from '@/lib/rbacPermissions';

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

  const hasAccess = await checkPermission(approver, PERMISSION_KEYS.LEAVE_APPROVE);
  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions to approve/reject leaves' });
  }

  const { id, status, reason } = req.body;

  if (!id || !status) {
    return res.status(400).json({ success: false, error: 'Missing ID or status' });
  }

  // Validate reason for Rejected and Cancelled status
  if ((status === 'Rejected' || status === 'Cancelled') && (!reason || reason.trim() === '')) {
    return res.status(400).json({ 
      success: false, 
      error: `Reason is required when ${status.toLowerCase()} a leave request` 
    });
  }

  try {
    const leaveRequest = await prisma.leave_requests.findUnique({
      where: { id: parseInt(id) }
    });

    if (!leaveRequest) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    // Prepare update data based on status
    let updateData = { status };
    
    if (status === 'Rejected') {
      updateData.resoan_to_reject = reason;
      // Clear any previous cancellation reason
      updateData.reason_to_cancel = null;
    } else if (status === 'Cancelled') {
      updateData.reason_to_cancel = reason;
      // Clear any previous rejection reason
      updateData.resoan_to_reject = null;
    } else if (status === 'Approved') {
      // Clear both reason fields when approving
      updateData.resoan_to_reject = null;
      updateData.reason_to_cancel = null;
    }

    await prisma.leave_requests.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.status(200).json({ success: true, message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating leave status:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
}
