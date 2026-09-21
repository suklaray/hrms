import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from '@/lib/auth';

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  

  const user = await verifyEmployeeToken(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { leaveId ,reason_to_cancel } = body;
  // console.log(body);
  if (!leaveId) {
    return NextResponse.json({ message: 'Leave ID is required' }, { status: 400 });
  }

  try {
    // First, get the leave request to verify ownership and check if it can be cancelled
    const leaveRequest = await prisma.leave_requests.findFirst({
      where: {
        id: parseInt(leaveId),
        empid: user.empid
      }
    });

    if (!leaveRequest) {
      return NextResponse.json({ message: 'Leave request not found' }, { status: 404 });
    }
    if (!reason_to_cancel?.trim()) {
      return NextResponse.json({
        message: 'Cancellation reason is required'
      }, { status: 400 });
    }
    // Check if leave can be cancelled (only pending leaves that haven't started)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const leaveStartDate = new Date(leaveRequest.from_date);
    leaveStartDate.setHours(0, 0, 0, 0);

    if (leaveRequest.status !== 'Pending') {
      return NextResponse.json({ 
        message: `Cannot cancel ${leaveRequest.status.toLowerCase()} leave request` 
      }, { status: 400 });
    }

    if (leaveStartDate <= today) {
      return NextResponse.json({ 
        message: 'Cannot cancel leave request as the leave date has already started or passed' 
      }, { status: 400 });
    }

    // Update the leave request status to Cancelled
    await prisma.leave_requests.update({
      where: { id: parseInt(leaveId) },
      data: { status: 'Cancelled', 
      reason_to_cancel: reason_to_cancel.trim()
     }
    });

    return NextResponse.json({ message: 'Leave request cancelled successfully' }, { status: 200 });
  } catch (err) {
    console.error('Error cancelling leave request:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

