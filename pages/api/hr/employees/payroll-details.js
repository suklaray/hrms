import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export default async function handler(req, res) {
  const { empid } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!empid) {
    return res.status(400).json({ message: 'Employee ID is required' });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const isSelf = (decoded.empid === empid || decoded.id === empid);
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_VIEW) || await checkPermission(decoded, PERMISSION_KEYS.PAYSLIP_VIEW);

    if (!isSelf && !hasAccess) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }

    // Get user data from users table using empid
    const user = await prisma.users.findUnique({
      where: { empid },
    });

    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (user.status === "Inactive") {
      return res.status(403).json({ message: "Access denied. Employee is inactive." });
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

    res.status(200).json(employee);
  } catch (error) {
    console.error('Error fetching employee details:', error);
    res.status(500).json({ message: 'Database error' });
  }
}
