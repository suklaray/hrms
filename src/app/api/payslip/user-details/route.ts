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

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const empid = req.nextUrl.searchParams.get("empid");
    if (!empid) return NextResponse.json({ error: "Employee ID required" }, { status: 400 });

    // Check if the user has permission to view payslip details
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYSLIP_VIEW);
    if (!hasAccess) return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });

    // Find user by empid
    const user = await prisma.users.findUnique({
      where: { empid: empid },
      select: { empid: true, name: true, email: true, role: true, contact_number: true, position: true }
    });
    
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Find employee record using main_employee_id matching users.empid
    const employee = await prisma.employees.findFirst({
      where: { main_employee_id: user.empid }
    });

    let bankDetails = null;
    if (employee) {
      // Find bank details using employee.empid
      bankDetails = await prisma.bank_details.findFirst({
        where: { employee_id: employee.empid }
      });
    }

    const finalEmployee = {
      ...user,
      contact_number: employee?.contact_no || user.contact_number || 'Not provided',
      bankDetails: bankDetails
    };

    return NextResponse.json(finalEmployee, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }
}
