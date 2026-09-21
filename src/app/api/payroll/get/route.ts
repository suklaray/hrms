import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest) {
  const empid = req.nextUrl.searchParams.get('empid');

  if (!empid) {
    return NextResponse.json({ message: 'Employee ID is required' }, { status: 400 });
  }

  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Access denied' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (!decoded) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    const isSelf = (decoded.empid === empid || String(decoded.id) === empid);
    const hasPermissionAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_VIEW);

    if (!isSelf && !hasPermissionAccess) {
      return NextResponse.json({ message: 'Access denied: insufficient permissions' }, { status: 403 });
    }

    const payrolls = await prisma.payroll.findMany({
      where: { empid },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return NextResponse.json(payrolls, { status: 200 });
  } catch (error) {
    console.error('Error fetching employee payroll:', error);
    return NextResponse.json({ message: 'Database error' }, { status: 500 });
  }
}
