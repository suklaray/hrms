import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = cookie.parse(cookieHeader);
  const token = cookies.token || req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if the user has permission to view payslip details
  const hasAccess = await checkPermission(token, PERMISSION_KEYS.PAYSLIP_VIEW);
  if (!hasAccess) return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    const searchParams = req.nextUrl.searchParams;
    const empid = searchParams.get("empid") || undefined;
    const month = searchParams.get("month") || undefined;
    const yearStr = searchParams.get("year");
    const year = yearStr ? parseInt(yearStr) : undefined;
    
    // Use empid from URL parameter (for the specific payslip being viewed)
    const payslip = await prisma.payroll.findFirst({
      where: { empid, month, year }
    });
    
    if (!payslip) return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    return NextResponse.json(payslip, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }
}
