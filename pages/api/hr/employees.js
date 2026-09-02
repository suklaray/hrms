import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { getAccessibleRoles } from "@/lib/roleBasedAccess";

import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Check authentication
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ message: "Access denied" });
    }

    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.EMPLOYEE_VIEW);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
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

    return res.status(200).json({ employees: employeesWithPayrollStatus });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
