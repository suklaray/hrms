import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import * as cookie from "cookie";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  

  try {
    const cookies = cookie.parse(req.headers.get('cookie') || '');
    const { token } = cookies;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    const user = decoded;
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.ATTENDANCE_REGULARIZATION_CREATE);
    if (!hasAccess) {
      return NextResponse.json({ message: 'Unauthorized: insufficient permissions' }, { status: 403 });
    }

    const { attendance_id, attendance_date, check_in_time, requested_checkout, reason } = body;

    // Validation
    if (!attendance_date || !check_in_time || !requested_checkout || !reason?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (reason.trim().length > 500) {
      return NextResponse.json({ error: 'Reason cannot exceed 500 characters' }, { status: 400 });
    }

    const checkIn = new Date(check_in_time);
    const checkOut = new Date(requested_checkout);
    const attendanceDateParsed = new Date(attendance_date);

    if (checkOut <= checkIn) {
      return NextResponse.json({ error: 'Check-out time must be after check-in time' }, { status: 400 });
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
        return NextResponse.json({
          error: 'Attendance record not found'
        }, { status: 404 });
      }
    }

    // Check if request already exists
    const existing = await prisma.attendance_regularization.findFirst({
      where: {
        empid: user.empid,
        attendance_date: attendanceDateParsed,
        status: 'PENDING'
      }
    });

    if (existing) {
      return NextResponse.json({
        error: 'A pending regularization request already exists for this date'
      }, { status: 400 });
    }

    // Create regularization request
    const request = await prisma.attendance_regularization.create({
      data: {
        empid: user.empid,
        attendance_id: attendance_id ? parseInt(attendance_id) : null,
        attendance_date: attendanceDateParsed,
        check_in_time: checkIn,
        requested_checkout: checkOut,
        reason: reason.trim(),
        status: 'PENDING'
      }
    });

    return NextResponse.json({
      message: 'Regularization request submitted successfully',
      request
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting regularization request:', error);
    return NextResponse.json({
      error: 'Failed to submit regularization request'
    }, { status: 500 });
  }
}

