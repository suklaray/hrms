import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { getRequestBody } from "@/lib/routeHelper";

async function authenticate(req: NextRequest) {
  if (!process.env.JWT_SECRET) {
    return { error: 'Server configuration error', status: 500 } as const;
  }

  const cookies = cookie.parse(req.headers.get('cookie') || '');
  const { token } = cookies;
  if (!token) return { error: 'Unauthorized', status: 401 } as const;

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return { error: 'Invalid token', status: 401 } as const;
  }

  const user = await prisma.users.findUnique({
    where: { empid: decoded.empid || decoded.id },
    select: { empid: true, role: true, name: true }
  });
  if (!user) return { error: 'User not found', status: 401 } as const;

  return { user, decoded };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { decoded } = auth;

    const canAccess = (await checkPermission(decoded, PERMISSION_KEYS.TASK_CREATE))
      || (await checkPermission(decoded, PERMISSION_KEYS.TASK_VIEW));
    if (!canAccess) return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });

    const employees = await prisma.users.findMany({
      where: { status: { not: 'Inactive' } },
      select: { empid: true, name: true, email: true, role: true, employee_type: true, position: true },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json({ employees }, { status: 200 });
  } catch (error: any) {
    console.error('Task management API error:', error);
    if (error.code === 'P2002') return NextResponse.json({ error: 'Database constraint violation' }, { status: 400 });
    if (error.code === 'P2025') return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { user, decoded } = auth;

    const canCreate = await checkPermission(decoded, PERMISSION_KEYS.TASK_CREATE);
    if (!canCreate) return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });

    const body = await getRequestBody(req);
    const { title, description, assigned_to, priority, deadline } = body || {};
    if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (!assigned_to?.trim()) return NextResponse.json({ error: 'Assigned to is required' }, { status: 400 });
    if (!priority) return NextResponse.json({ error: 'Priority is required' }, { status: 400 });
    if (!deadline) return NextResponse.json({ error: 'Deadline is required' }, { status: 400 });

    const deadlineDate = new Date(deadline + '+05:30');
    if (isNaN(deadlineDate.getTime())) return NextResponse.json({ error: 'Invalid deadline format' }, { status: 400 });

    const assignedUser = await prisma.users.findUnique({
      where: { empid: assigned_to },
      select: { empid: true }
    });
    if (!assignedUser) return NextResponse.json({ error: 'Assigned user not found' }, { status: 400 });

    const createdTask = await prisma.tasks.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        assigned_to,
        assigned_by: user.empid,
        priority,
        deadline: deadlineDate,
        status: 'Pending'
      }
    });
    return NextResponse.json({ message: 'Task created successfully', taskId: createdTask.id }, { status: 201 });
  } catch (error: any) {
    console.error('Task management API error:', error);
    if (error.code === 'P2002') return NextResponse.json({ error: 'Database constraint violation' }, { status: 400 });
    if (error.code === 'P2025') return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
