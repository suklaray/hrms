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
    // Check authentication and authorization
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Access denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !['admin', 'hr', 'superadmin'].includes(decoded.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await prisma.users.findUnique({
      where: { empid },
      select: {
        empid: true,
        name: true,
        email: true,
        role: true,
        position: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if user can access this employee's data
    if (!canAccessRole(decoded.role, user.role)) {
      return res.status(403).json({ message: 'Access denied to this employee data' });
    }

    const employeeData = await prisma.employees.findFirst({
      where: { email: user.email },
      select: { contact_no: true },
    });

    const employee = {
      ...user,
      contact_number: employeeData?.contact_no || null,
    };

    res.status(200).json(employee);
  } catch (error) {
    console.error('Error fetching employee details:', error);
    res.status(500).json({ message: 'Database error' });
  }
}
