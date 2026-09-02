import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

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

    const isSelf = (decoded.empid === empid || decoded.id === empid);
    const hasPermissionAccess = (await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_VIEW)) || (await checkPermission(decoded, PERMISSION_KEYS.PAYSLIP_VIEW));

    if (!isSelf && !hasPermissionAccess) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
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
