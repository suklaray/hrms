import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";
import { checkPermission } from '@/lib/rbac';
import { PERMISSION_KEYS } from '@/lib/rbacPermissions';
import { getRequestBody } from "@/lib/routeHelper";

async function authenticate(req: NextRequest) {
  const cookies = cookie.parse(req.headers.get('cookie') || '');
  const { token } = cookies;
  
  if (!token) {
    return { error: 'Unauthorized', status: 401 } as const;
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || '');
  } catch {
    return { error: 'Invalid token', status: 401 } as const;
  }

  const user = await prisma.users.findUnique({
    where: { empid: decoded.empid || decoded.id },
    select: { empid: true, role: true, name: true }
  });

  if (!user) {
    return { error: 'User not found', status: 401 } as const;
  }

  const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.TASK_MY);
  if (!hasAccess) {
    return { error: 'Forbidden: insufficient permissions', status: 403 } as const;
  }

  return { user, decoded };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    // Get tasks assigned to current user
    const tasks = await prisma.tasks.findMany({
      where: { assigned_to: user.empid },
      orderBy: { created_at: 'desc' }
    });

    // Get assigned by user names separately
    const tasksWithAssigner = await Promise.all(
      tasks.map(async (task) => {
        const assigner = await prisma.users.findUnique({
          where: { empid: task.assigned_by },
          select: { name: true, empid: true }
        });
        return {
          ...task,
          assignedBy: assigner
        };
      })
    );

    return NextResponse.json({ tasks: tasksWithAssigner }, { status: 200 });
  } catch (error) {
    console.error('User task API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { user } = auth;

    const body = await getRequestBody(req);
    const { taskId, status } = body || {};
    
    if (!taskId || !status) {
      return NextResponse.json({ error: 'Task ID and status are required' }, { status: 400 });
    }

    // Verify task belongs to user
    const task = await prisma.tasks.findFirst({
      where: { 
        id: parseInt(taskId),
        assigned_to: user.empid 
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const updatedTask = await prisma.tasks.update({
      where: { id: parseInt(taskId) },
      data: { status }
    });

    return NextResponse.json({ message: 'Task status updated', task: updatedTask }, { status: 200 });
  } catch (error) {
    console.error('User task API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
