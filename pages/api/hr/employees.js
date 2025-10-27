import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { getAccessibleRoles } from "@/lib/roleBasedAccess";

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
    if (!decoded || !['admin', 'hr', 'superadmin'].includes(decoded.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const accessibleRoles = getAccessibleRoles(decoded.role);
    
    const employees = await prisma.users.findMany({
      where: { 
        role: { 
          in: accessibleRoles 
        },
        status: { not: "Inactive" } // Exclude inactive employees
      },
      select: {
        empid: true,
        name: true,
        email: true,
        contact_number: true,
        role: true,
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
