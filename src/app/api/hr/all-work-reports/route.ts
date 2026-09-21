import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  

  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: "Access denied" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.REPORT_VIEW);
    if (!hasAccess) {
      return NextResponse.json({ message: "Access denied: insufficient permissions" }, { status: 403 });
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

    return NextResponse.json({ reports: formattedReports, leaves }, { status: 200 });
  } catch (error) {
    console.error("Error fetching work reports:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

