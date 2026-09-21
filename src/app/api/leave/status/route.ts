import { NextRequest, NextResponse } from "next/server";
// pages/api/leave/status.js
import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from '@/lib/auth';

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  // Verify JWT token and get user data
  const user = await verifyEmployeeToken(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await prisma.leave_requests.findMany({
      where: { empid: user.empid },
      select: {
        id: true,
        leave_type: true,
        from_date: true,
        to_date: true,
        status: true,
        reason: true,
        resoan_to_reject: true,
        reason_to_cancel: true,
        attachment: true,
        applied_at: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    return NextResponse.json(rows, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}


