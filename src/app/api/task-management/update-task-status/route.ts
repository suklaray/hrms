import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";
import { checkPermission, isSuperAdmin } from '@/lib/rbac';
import { PERMISSION_KEYS } from '@/lib/rbacPermissions';
import { getAccessibleRoles } from '@/lib/roleBasedAccess';

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  try {
    const cookies = cookie.parse(req.headers.get('cookie') || '');
    const { token } = cookies;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const canUpdate = await checkPermission(decoded, PERMISSION_KEYS.TASK_UPDATE_STATUS);
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    const body = (await getRequestBody(req)) || {};
    const { taskId, status } = body;

    const parsedTaskId = Number(taskId);
    if (!Number.isInteger(parsedTaskId) || parsedTaskId <= 0 || !status) {
      return NextResponse.json({ error: 'Task ID and status are required' }, { status: 400 });
    }

    if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid task status' }, { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: {
        empid: true,
        role: true,
        rbacRole: { select: { name: true, status: true } },
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const task = await prisma.tasks.findUnique({
      where: { id: parsedTaskId },
      select: {
        id: true,
        assigned_to: true,
        assignee: {
          select: {
            rbacRole: { select: { name: true, status: true } },
          },
        },
      },
    });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!isSuperAdmin(user)) {
      const allowedRoleNames = await getAccessibleRoles(user);
      const assigneeRole = task.assignee?.rbacRole;
      if (
        !assigneeRole ||
        assigneeRole.status !== 'ACTIVE' ||
        !allowedRoleNames.some((roleName) => roleName.toLowerCase() === assigneeRole.name.toLowerCase())
      ) {
        return NextResponse.json({ error: 'Access denied: task is outside your hierarchy' }, { status: 403 });
      }
    }

    await prisma.tasks.update({
      where: { id: parsedTaskId },
      data: { status }
    });

    return NextResponse.json({ message: 'Task status updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
