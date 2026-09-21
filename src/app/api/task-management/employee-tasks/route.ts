import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from '@/lib/prisma';
import { checkPermission } from '@/lib/rbac';
import { PERMISSION_KEYS } from '@/lib/rbacPermissions';
import { getQueryParams } from '@/lib/routeHelper';

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  try {
    const { token } = cookie.parse(req.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: { empid: true, role: true }
    });

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { employeeId } = await getQueryParams(req, context?.params);
    if (!employeeId) return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });

    // Must have task.view OR be viewing own tasks
    const canViewAll = await checkPermission(decoded, PERMISSION_KEYS.TASK_VIEW);
    if (!canViewAll && user.empid !== employeeId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Now get tasks for this employee
    const tasks = await prisma.tasks.findMany({
      where: { assigned_to: employeeId },
      select: {
        id: true,
        title: true,
        description: true,
        assigned_to: true,
        assigned_by: true,
        deadline: true,
        priority: true,
        status: true,
        created_at: true,
        updated_at: true
      },
      orderBy: { created_at: 'desc' }
    });

    // Get creator names separately
    const tasksWithCreator = await Promise.all(
      tasks.map(async (task) => {
        const creator = await prisma.users.findUnique({
          where: { empid: task.assigned_by },
          select: { name: true }
        });
        return {
          ...task,
          creator_name: creator?.name || 'Unknown'
        };
      })
    );

    return NextResponse.json({ tasks: tasksWithCreator }, { status: 200 });
  } catch (error) {
    console.error('Employee tasks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
