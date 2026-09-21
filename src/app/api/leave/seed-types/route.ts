import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from 'jsonwebtoken';
import type { DecodedToken } from "@/lib/jwtTypes";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.LEAVE_MANAGE_TYPES);
    if (!hasAccess) {
      return NextResponse.json({ message: 'Access denied: insufficient permissions' }, { status: 403 });
    }

    const { type_name, max_days, paid } = body;

    const existingLeaveType = await prisma.leave_types.findFirst({
      where: { type_name },
    });

    if (existingLeaveType) {
      await prisma.leave_types.update({
        where: { id: existingLeaveType.id },
        data: {
          max_days: Number(max_days),
          paid: paid !== undefined ? Boolean(paid) : true,
        },
      });
    } else {
      await prisma.leave_types.create({
        data: {
          type_name,
          max_days: Number(max_days),
          paid: paid !== undefined ? Boolean(paid) : true,
        },
      });
    }

    return NextResponse.json({ message: 'Leave type configured successfully' }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Database error' }, { status: 500 });
  }
}


