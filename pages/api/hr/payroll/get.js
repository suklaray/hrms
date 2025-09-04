import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { canAccessRole } from "@/lib/roleBasedAccess";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { empid } = req.query;

  if (!empid) {
    return res.status(400).json({ message: 'Employee ID is required' });
  }

  try {
    // Check authentication and authorization
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Allow employees to access their own payroll data
    if (decoded.role === 'employee') {
      if (decoded.empid !== empid) {
        return res.status(403).json({ message: 'Access denied to this employee data' });
      }
    } else if (!['admin', 'hr', 'superadmin'].includes(decoded.role)) {
      return res.status(403).json({ message: 'Access denied' });
    } else {
      // For HR/admin roles, check if they can access this employee's data
      const targetEmployee = await prisma.users.findUnique({
        where: { empid },
        select: { role: true }
      });

      if (!targetEmployee || !canAccessRole(decoded.role, targetEmployee.role)) {
        return res.status(403).json({ message: 'Access denied to this employee data' });
      }
    }

    const payrolls = await prisma.payroll.findMany({
      where: { empid },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.status(200).json(payrolls);
  } catch (error) {
    console.error('Error fetching employee payroll:', error);
    res.status(500).json({ message: 'Database error' });
  }
}
