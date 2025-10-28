import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { canAccessRole } from "@/lib/roleBasedAccess";

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

    if (decoded.role === 'employee') {
      if (decoded.empid !== empid) {
        return res.status(403).json({ message: 'Access denied to this employee data' });
      }
    } else if (!['admin', 'hr', 'superadmin'].includes(decoded.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await prisma.users.findUnique({
      where: { empid },
    });

    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (user.status === "Inactive") {
      return res.status(403).json({ message: "Access denied. Employee is inactive." });
    }

    if (['admin', 'hr', 'superadmin'].includes(decoded.role) && !canAccessRole(decoded.role, user.role)) {
      return res.status(403).json({ message: 'Access denied to this employee data' });
    }

    let bankDetails = null;
    let employeeContact = null;
    
    if (user.candidate_id) {
      // Step 1: Find employee record using candidate_id
      const employeeRecord = await prisma.employees.findFirst({
        where: { candidate_id: user.candidate_id },
      });
      
      if (employeeRecord) {
        employeeContact = employeeRecord.contact_no;
        
        // Step 2: Use employee.empid to get bank details
        const bankDetailsRecord = await prisma.bank_details.findFirst({
          where: { employee_id: employeeRecord.empid }
        });
        
        if (bankDetailsRecord) {
          bankDetails = bankDetailsRecord;
        }
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
