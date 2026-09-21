import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 });
  }
  const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_GENERATE);
  if (!hasAccess) return NextResponse.json({ success: false, message: 'Forbidden: insufficient permissions' }, { status: 403 });

  try {
    const configurations = await prisma.payrollConfiguration.findMany({
      include: {
        company: true,
      },
    });
    return NextResponse.json({ success: true, data: configurations }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching configurations:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
