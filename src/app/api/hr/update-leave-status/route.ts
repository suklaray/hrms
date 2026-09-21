import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { checkPermission, isSuperAdmin } from '@/lib/rbac';
import { PERMISSION_KEYS } from '@/lib/rbacPermissions';

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  

  // Authentication
  let token = null;
  if (req.headers.get('cookie')) {
    const parsed = cookie.parse(req.headers.get('cookie'));
    token = parsed.token;
  }

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let approver;
  try {
    approver = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const hasAccess = await checkPermission(approver, PERMISSION_KEYS.LEAVE_APPROVE);
  if (!hasAccess) {
    return NextResponse.json({ success: false, error: 'Insufficient permissions to approve/reject leaves' }, { status: 403 });
  }

  const { id, status, reason } = body;

  if (!id || !status) {
    return NextResponse.json({ success: false, error: 'Missing ID or status' }, { status: 400 });
  }

  // Validate reason for Rejected and Cancelled status
  if ((status === 'Rejected' || status === 'Cancelled') && (!reason || reason.trim() === '')) {
    return NextResponse.json({ 
      success: false, 
      error: `Reason is required when ${status.toLowerCase()} a leave request` 
    }, { status: 400 });
  }

  try {
    const leaveRequest = await prisma.leave_requests.findUnique({
      where: { id: parseInt(id) }
    });

    if (!leaveRequest) {
      return NextResponse.json({ success: false, error: 'Leave request not found' }, { status: 404 });
    }

    // Prepare update data based on status
    let updateData: Record<string, any> = { status };
    
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

    return NextResponse.json({ success: true, message: 'Status updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating leave status:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}


