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
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.REPORT_VIEW);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    
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
      orderBy: {
        created_at: 'desc'
      }
    });

    const formattedReports = reports.map(report => ({
      ...report,
      user: report.users,
      empid: report.users?.empid
    }));

    const leaves = await prisma.leave_requests.findMany({
      where: { users: { status: { not: 'Inactive' } } },
      select: {
        id: true,
        empid: true,
        from_date: true,
        to_date: true,
        leave_type: true,
        status: true,
        reason: true,
        name: true,
      }
    });

    return res.status(200).json({ reports: formattedReports, leaves });
  } catch (error) {
    console.error("Error fetching work reports:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}