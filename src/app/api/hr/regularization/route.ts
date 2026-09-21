import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { checkPermission, isSuperAdmin } from '@/lib/rbac';
import { PERMISSION_KEYS } from '@/lib/rbacPermissions';

function getUserFromToken(req: NextRequest): any {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = cookie.parse(cookieHeader);
  const token = cookies.token || req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.ATTENDANCE_REGULARIZE_APPROVE) || await checkPermission(user, PERMISSION_KEYS.ATTENDANCE_REGULARIZE);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
  }

  try {
    const status = req.nextUrl.searchParams.get('status') || 'PENDING';
    const empid = req.nextUrl.searchParams.get('empid');

    const where: any = {};
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

    return NextResponse.json({ success: true, requests }, { status: 200 });
  } catch (err) {
    console.error('Fetch regularization error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.ATTENDANCE_REGULARIZE_APPROVE) || await checkPermission(user, PERMISSION_KEYS.ATTENDANCE_REGULARIZE);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { id, action, rejection_reason } = body;

    if (!id || !['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (action === 'REJECTED' && !rejection_reason?.trim()) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    const request = await prisma.attendance_regularization.findUnique({
      where: { id: parseInt(id) }
    });

    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (request.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }
    if (request.empid === user.empid && !isSuperAdmin(user)) {
      return NextResponse.json({ error: 'You cannot approve or reject your own regularization request' }, { status: 403 });
    }

    if (action === 'APPROVED') {
      const checkIn = new Date(request.check_in_time);
      const checkOut = new Date(request.requested_checkout);
      const totalSeconds = (checkOut.getTime() - checkIn.getTime()) / 1000;
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

    return NextResponse.json({ success: true, updated }, { status: 200 });
  } catch (err) {
    console.error('Process regularization error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
