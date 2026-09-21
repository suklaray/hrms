import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { getAccessibleRoles } from "@/lib/roleBasedAccess";

import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {


  try {
    // Check authentication
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: "Access denied" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return NextResponse.json({ message: "Access denied" }, { status: 401 });
    }

    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.EMPLOYEE_VIEW);
    if (!hasAccess) {
      return NextResponse.json({ message: "Access denied: insufficient permissions" }, { status: 403 });
    }

    const employees = await prisma.users.findMany({
      where: {
        status: { not: "Inactive" } // Exclude inactive employees
      },
      select: {
        empid: true,
        name: true,
        email: true,
        contact_number: true,
        role: true,
        position: true,
        status: true,
        created_at: true
      }
    });

    // Check payroll generation status for each employee
    const employeesWithPayrollStatus = await Promise.all(
      employees.map(async (emp) => {
        const currentMonth = new Date().toLocaleString('default', { month: 'long' });
        const currentYear = new Date().getFullYear();

        // Check current month payroll
        const currentPayroll = await prisma.payroll.findFirst({
          where: {
            empid: emp.empid,
            month: currentMonth,
            year: currentYear
          },
          select: {
            payslip_status: true,
            generated_on: true
          }
        });

        // Get most recent payroll for last payment date
        const lastPayroll = await prisma.payroll.findFirst({
          where: {
            empid: emp.empid
          },
          orderBy: {
            generated_on: 'desc'
          },
          select: {
            generated_on: true
          }
        });

        return {
          ...emp,
          payrollGenerated: !!currentPayroll,
          payslipStatus: currentPayroll ? 'generated' : 'pending',
          lastPaymentDate: lastPayroll?.generated_on || null,
          phone: emp.contact_number
        };
      })
    );

    return NextResponse.json({ employees: employeesWithPayrollStatus }, { status: 200 });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}


