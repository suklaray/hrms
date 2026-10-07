import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";
import { checkPermission, isSuperAdmin, getAssignableRolesForUser } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { getRequestBody } from "@/lib/routeHelper";
import { getAccessibleRoles } from "@/lib/roleBasedAccess"; // your hierarchy helper

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
    select: {
      empid: true, role: true, name: true,
      rbacRole: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    }
  });
  if (!user) return { error: 'User not found', status: 401 } as const;

  return { user, decoded };
}
async function getAllowedRoleNames(user: any): Promise<string[] | null> {
  // Super admin can see everyone
  if (isSuperAdmin(user)) return null; // null = no filter

  const accessibleRoleNames = await getAccessibleRoles(user);
  return accessibleRoleNames;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { user, decoded } = auth;

    const canAccess = (await checkPermission(decoded, PERMISSION_KEYS.TASK_CREATE))
      || (await checkPermission(decoded, PERMISSION_KEYS.TASK_VIEW));
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    // ---- HIERARCHY FILTER ----
    const allowedRoleNames = await getAllowedRoleNames(user);

    const employees = await prisma.users.findMany({
      where: {
        status: { not: 'Inactive' },
        ...(allowedRoleNames
          ? { rbacRole: { name: { in: allowedRoleNames }, status: 'ACTIVE' } }
          : {}),
      },
      select: {
        empid: true,
        name: true,
        email: true,
        role: true,
        employee_type: true,
        position: true,
        rbacRole: { select: { id: true, name: true } },
      },
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
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    const body = await getRequestBody(req);
    const { title, description, assigned_to, priority, deadline } = body || {};
    if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (!assigned_to?.trim()) return NextResponse.json({ error: 'Assigned to is required' }, { status: 400 });
    if (!priority) return NextResponse.json({ error: 'Priority is required' }, { status: 400 });
    if (!deadline) return NextResponse.json({ error: 'Deadline is required' }, { status: 400 });

    const deadlineDate = new Date(deadline + '+05:30');
    if (isNaN(deadlineDate.getTime())) return NextResponse.json({ error: 'Invalid deadline format' }, { status: 400 });

    // ---- HIERARCHY CHECK ON ASSIGNEE ----
    const allowedRoleNames = await getAllowedRoleNames(user);

    const assignedUser = await prisma.users.findFirst({
      where: {
        empid: assigned_to,
        ...(allowedRoleNames
          ? { rbacRole: { name: { in: allowedRoleNames }, status: 'ACTIVE' } }
          : {}),
      },
      select: { empid: true }
    });

    if (!assignedUser) {
      return NextResponse.json(
        { error: 'Assigned user not found or outside your hierarchy' },
        { status: 400 }
      );
    }

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

    return NextResponse.json(
      { message: 'Task created successfully', taskId: createdTask.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Task management API error:', error);
    if (error.code === 'P2002') return NextResponse.json({ error: 'Database constraint violation' }, { status: 400 });
    if (error.code === 'P2025') return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { user, decoded } = auth;

    const canEdit = await checkPermission(decoded, PERMISSION_KEYS.TASK_EDIT);
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    const body = await getRequestBody(req);
    const parsedTaskId = Number(body?.taskId);
    const { title, description, deadline } = body || {};

    if (!Number.isInteger(parsedTaskId) || parsedTaskId <= 0) {
      return NextResponse.json({ error: 'A valid task ID is required' }, { status: 400 });
    }
    if (typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({ error: 'Task title must be at least 3 characters' }, { status: 400 });
    }
    if (description != null && typeof description !== 'string') {
      return NextResponse.json({ error: 'Task description must be text' }, { status: 400 });
    }
    if (typeof description === 'string' && description.length > 500) {
      return NextResponse.json({ error: 'Task description must be 500 characters or fewer' }, { status: 400 });
    }
    if (typeof deadline !== 'string' || !deadline) {
      return NextResponse.json({ error: 'A deadline is required' }, { status: 400 });
    }

    const deadlineValue = /(?:Z|[+-]\d{2}:\d{2})$/i.test(deadline)
      ? deadline
      : `${deadline}+05:30`;
    const deadlineDate = new Date(deadlineValue);
    if (Number.isNaN(deadlineDate.getTime())) {
      return NextResponse.json({ error: 'Invalid deadline format' }, { status: 400 });
    }

    const task = await prisma.tasks.findUnique({
      where: { id: parsedTaskId },
      select: {
        id: true,
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
      const assigneeRole = task.assignee.rbacRole;
      if (
        !assigneeRole ||
        assigneeRole.status !== 'ACTIVE' ||
        !allowedRoleNames.some((roleName) => roleName.toLowerCase() === assigneeRole.name.toLowerCase())
      ) {
        return NextResponse.json({ error: 'Access denied: task is outside your hierarchy' }, { status: 403 });
      }
    }

    const updatedTask = await prisma.tasks.update({
      where: { id: parsedTaskId },
      data: {
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() || null : null,
        deadline: deadlineDate,
      },
    });

    return NextResponse.json({ message: 'Task updated successfully', task: updatedTask }, { status: 200 });
  } catch (error: any) {
    console.error('Task management API error:', error);
    if (error.code === 'P2025') return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}