import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(403).json({ message: "Invalid token" });
    }
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_GENERATE);
    if (!hasAccess) return res.status(403).json({ message: 'Forbidden: insufficient permissions' });

    const { empid } = req.query;
    const targetEmpid = empid || decoded.empid || decoded.id;

    const payslips = await prisma.payroll.findMany({
      where: { empid: targetEmpid },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      select: {
        id: true,
        month: true,
        year: true,
        net_pay: true,
        generated_on: true,
        payslip_status: true
      }
    });

    res.status(200).json({
      success: true,
      payslips
    });

  } catch (error) {
    console.error("Payslip lists API error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error"
    });
  }
}
