import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { getAccessibleRoles } from "@/lib/roleBasedAccess";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { empid } = req.query;

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !['admin', 'hr', 'superadmin'].includes(decoded.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const accessibleRoles = getAccessibleRoles(decoded.role);
    
    const employee = await prisma.users.findUnique({
      where: { empid },
      select: { role: true, name: true, empid: true }
    });

    if (!employee || !accessibleRoles.includes(employee.role)) {
      return res.status(403).json({ message: "Access denied to this employee's data" });
    }

    const reports = await prisma.daily_work_reports.findMany({
      where: { empid },
      include: {
        users: {
          select: {
            empid: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        report_date: 'desc'
      }
    });

    return res.status(200).json({ reports, employee });
  } catch (error) {
    console.error("Error fetching employee work reports:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}