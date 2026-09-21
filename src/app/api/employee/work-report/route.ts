import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { checkPermission } from '@/lib/rbac';
import { PERMISSION_KEYS } from '@/lib/rbacPermissions';

async function checkAuth(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = parse(cookieHeader);
  const token = cookies.token || req.cookies.get('token')?.value;
  
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.REPORT_SUBMIT);
    if (!hasAccess) {
      return { error: NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 }) };
    }
    return { decoded };
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

export async function POST(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth.error) return auth.error;
  const decoded = auth.decoded;

  try {
    const body = await req.json().catch(() => ({}));
    const { tasks_completed, tasks_tomorrow, issues } = body;
    
    if (!tasks_completed || !tasks_tomorrow) {
      return NextResponse.json({ error: 'Tasks completed and tomorrow tasks are required' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingReport = await prisma.daily_work_reports.findFirst({
      where: {
        empid: decoded.empid,
        report_date: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    if (existingReport) {
      const updatedReport = await prisma.daily_work_reports.update({
        where: { id: existingReport.id },
        data: {
          tasks_completed,
          tasks_tomorrow,
          issues: issues || null
        }
      });
      return NextResponse.json({ message: 'Work report updated successfully', report: updatedReport }, { status: 200 });
    } else {
      const newReport = await prisma.daily_work_reports.create({
        data: {
          empid: decoded.empid,
          tasks_completed,
          tasks_tomorrow,
          issues: issues || null
        }
      });
      return NextResponse.json({ message: 'Work report submitted successfully', report: newReport }, { status: 201 });
    }
  } catch (error) {
    console.error('Work report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req);
  if (auth.error) return auth.error;
  const decoded = auth.decoded;

  try {
    const [reports, leaves] = await Promise.all([
      prisma.daily_work_reports.findMany({
        where: { empid: decoded.empid },
        orderBy: { report_date: 'desc' },
      }),
      prisma.leave_requests.findMany({
        where: { empid: decoded.empid },
        select: { id: true, from_date: true, to_date: true, leave_type: true, status: true, reason: true }
      })
    ]);
    return NextResponse.json({ reports, leaves }, { status: 200 });
  } catch (error) {
    console.error('Work report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
