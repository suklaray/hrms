import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";
import { checkPermission } from '@/lib/rbac';
import { PERMISSION_KEYS } from '@/lib/rbacPermissions';

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  

  try {
    const cookies = cookie.parse(req.headers.get('cookie') || '');
    const { token } = cookies;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const canUpdate = await checkPermission(decoded, PERMISSION_KEYS.TASK_EDIT);
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    const { taskId, status } = body;

    if (!taskId || !status) {
      return NextResponse.json({ error: 'Task ID and status are required' }, { status: 400 });
    }

    await prisma.tasks.update({
      where: { id: taskId },
      data: { status }
    });

    return NextResponse.json({ message: 'Task status updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


