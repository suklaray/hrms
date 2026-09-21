import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  

  try {
    const { token } = cookie.parse(req.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.TASK_DELETE);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
    }

    const { taskIds } = body;
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: 'Task IDs are required' }, { status: 400 });
    }

    await prisma.tasks.deleteMany({
      where: { id: { in: taskIds } }
    });

    return NextResponse.json({ message: 'Tasks deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Delete tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


