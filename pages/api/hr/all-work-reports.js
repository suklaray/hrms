import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { getAccessibleRoles } from "@/lib/roleBasedAccess";

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
    if (!decoded || !['admin', 'hr', 'superadmin'].includes(decoded.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const accessibleRoles = getAccessibleRoles(decoded.role);
    
    const reports = await prisma.daily_work_reports.findMany({
      include: {
        users: {
          select: {
            empid: true,
            name: true,
            role: true
          }
        }
      },
      where: {
        users: {
          role: {
            in: accessibleRoles
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const formattedReports = reports.map(report => ({
      ...report,
      user: report.users,
      empid: report.users?.empid
    }));

    return res.status(200).json(formattedReports);
  } catch (error) {
    console.error("Error fetching work reports:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}