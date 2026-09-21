import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ message: "Access denied" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (!decoded) {
      return NextResponse.json({ message: "Invalid token" }, { status: 403 });
    }
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYSLIP_VIEW);
    if (!hasAccess) return NextResponse.json({ message: 'Forbidden: insufficient permissions' }, { status: 403 });

    const empid = req.nextUrl.searchParams.get("empid");
    const targetEmpid = empid || decoded.empid || decoded.id;

    const payslips = await prisma.payroll.findMany({
      where: { empid: targetEmpid },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: {
        id: true,
        month: true,
        year: true,
        net_pay: true,
        generated_on: true,
        payslip_status: true
      }
    });

    return NextResponse.json({
      success: true,
      payslips
    }, { status: 200 });

  } catch (error) {
    console.error("Payslip lists API error:", error);
    return NextResponse.json({ 
      success: false,
      message: "Internal server error"
    }, { status: 500 });
  }
}
