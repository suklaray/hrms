import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import type { DecodedToken } from "@/lib/jwtTypes";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  const { empid } = query;

  

  if (!empid) {
    return NextResponse.json({ message: 'Employee ID is required' }, { status: 400 });
  }

  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Access denied' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    if (!decoded) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    const isSelf = (decoded.empid === empid || decoded.id === empid);
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_VIEW) || await checkPermission(decoded, PERMISSION_KEYS.PAYSLIP_VIEW);

    if (!isSelf && !hasAccess) {
      return NextResponse.json({ message: 'Access denied: insufficient permissions' }, { status: 403 });
    }

    // Get user data from users table using empid
    const user = await prisma.users.findUnique({
      where: { empid },
    });

    if (!user) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    if (user.status === "Inactive") {
      return NextResponse.json({ message: "Access denied. Employee is inactive." }, { status: 403 });
    }

    let bankDetails = null;
    let employeeContact = null;

    // Find employee record using main_employee_id (same as users.empid)
    const employeeRecord = await prisma.employees.findFirst({
      where: { main_employee_id: empid }, // Use main_employee_id instead of candidate_id
    });
    
    if (employeeRecord) {
      employeeContact = employeeRecord.contact_no;
      
      // Get bank details using employee.empid (auto-increment ID)
      const bankDetailsRecord = await prisma.bank_details.findFirst({
        where: { employee_id: employeeRecord.empid }
      });
      
      if (bankDetailsRecord) {
        bankDetails = bankDetailsRecord;
      }
    }

    const finalContact = user.contact_number || employeeContact || 'Not provided';

    const employee = {
      ...user,
      contact_number: finalContact,
      contact_no: finalContact,
      bankDetails: bankDetails,
    };

    return NextResponse.json(employee, { status: 200 });
  } catch (error) {
    console.error('Error fetching employee details:', error);
    return NextResponse.json({ message: 'Database error' }, { status: 500 });
  }
}



