import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";
import { checkPermission, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { getAccessibleRoles } from "@/lib/roleBasedAccess";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  try {
    const { token } = cookie.parse(req.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.TASK_DELETE);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    const body = (await getRequestBody(req)) || {};
    const { taskIds } = body;
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'Task IDs are required' }, { status: 400 });
    }

    if (!taskIds.every((taskId) => Number.isInteger(taskId) && taskId > 0)) {
      return NextResponse.json({ error: 'Task IDs must be positive integers' }, { status: 400 });
    }

    const uniqueTaskIds = [...new Set(taskIds)];
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: {
        empid: true,
        role: true,
      },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    const tasks = await prisma.tasks.findMany({
      where: { id: { in: uniqueTaskIds } },
      select: {
        id: true,
        assignee: {
          select: {
            rbacRole: { select: { name: true, status: true } },
          },
        },
      },
    });
    if (tasks.length !== uniqueTaskIds.length) {
      return NextResponse.json({ error: 'One or more tasks were not found' }, { status: 404 });
    }

    if (!isSuperAdmin(user)) {
      const allowedRoleNames = await getAccessibleRoles(user);
      const hasOutOfScopeTask = tasks.some(({ assignee }) => {
        const role = assignee?.rbacRole;
        return !role ||
          role.status !== 'ACTIVE' ||
          !allowedRoleNames.some((name) => name.toLowerCase() === role.name.toLowerCase());
      });
      if (hasOutOfScopeTask) {
        return NextResponse.json({ error: 'Access denied: one or more tasks are outside your hierarchy' }, { status: 403 });
      }
    }

    await prisma.tasks.deleteMany({
      where: { id: { in: uniqueTaskIds } }
    });

    return NextResponse.json({ message: 'Tasks deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Delete tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

