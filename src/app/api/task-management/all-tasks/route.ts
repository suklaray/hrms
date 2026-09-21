import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  

  try {
    const cookies = parse(req.headers.get('cookie') || '');
    const token = cookies.token;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user has permission to view all tasks
    const hasAccess = (await checkPermission(decoded, PERMISSION_KEYS.TASK_VIEW)) || (await checkPermission(decoded, PERMISSION_KEYS.TASK_CREATE));
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied: insufficient permissions' }, { status: 403 });
    }

    const tasks = await prisma.tasks.findMany({
      include: {
        assignee: {
          select: {
            name: true,
            empid: true,
            email: true
          }
        },
        creator: {
          select: {
            name: true,
            empid: true,
            email: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform the data to match expected format
    const transformedTasks = tasks.map(task => ({
      ...task,
      assignedBy: task.creator
    }));

    return NextResponse.json({ tasks: transformedTasks }, { status: 200 });
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

