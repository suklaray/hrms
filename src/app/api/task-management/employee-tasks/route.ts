import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from '@/lib/prisma';
import { checkPermission, isSuperAdmin } from '@/lib/rbac';
import { PERMISSION_KEYS } from '@/lib/rbacPermissions';
import { getQueryParams } from '@/lib/routeHelper';
import { getAccessibleRoles } from '@/lib/roleBasedAccess'; 
async function getAllowedRoleNames(user: any): Promise<string[] | null> {
  if (isSuperAdmin(user)) return null;
  const roles = await getAccessibleRoles(user);
  return roles && roles.length > 0 ? roles : null;
}

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  try {
    const { token } = cookie.parse(req.headers.get('cookie') || '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: {
        empid: true,
        role: true,
        name: true,
        rbacRole: {
          select: { id: true, name: true, status: true },
        },
      },
    });

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { employeeId } = await getQueryParams(req, context?.params);
    if (!employeeId) return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });

    // Must have task.view OR be viewing own tasks
    const canViewAll = await checkPermission(decoded, PERMISSION_KEYS.TASK_VIEW);
    const isSelf = user.empid === employeeId;

    if (!canViewAll && !isSelf) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!isSelf) {
      const allowedRoleNames = await getAllowedRoleNames(user);

      // If not super admin, verify target employee is within hierarchy
      if (allowedRoleNames) {
        const targetEmployee = await prisma.users.findFirst({
          where: {
            empid: employeeId,
            rbacRole: { name: { in: allowedRoleNames }, status: 'ACTIVE' },
          },
          select: { empid: true },
        });

        if (!targetEmployee) {
          return NextResponse.json(
            { error: 'Employee not found or outside your hierarchy' },
            { status: 403 }
          );
        }
      }
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
        updated_at: true,
        creator: {
          select: { empid: true, name: true },
        },
      },
      orderBy: { created_at: 'desc' }
    });
    return NextResponse.json({ tasks: tasks }, { status: 200 });
  } catch (error) {
    console.error('Employee tasks API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}