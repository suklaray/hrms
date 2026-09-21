import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import type { DecodedToken } from "@/lib/jwtTypes";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);
  const { empid } = query;

  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: "Access denied" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    if (!decoded) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const isSelf = decoded.empid === empid || String(decoded.id) === empid;
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.REPORT_VIEW);

    if (!isSelf && !hasAccess) {
      return NextResponse.json({ message: "Access denied: insufficient permissions" }, { status: 403 });
    }
    
    const employee = await prisma.users.findUnique({
      where: { empid },
      select: { role: true, name: true, empid: true }
    });

    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    const reports = await prisma.daily_work_reports.findMany({
      where: { empid },
      include: {
        users: {
          select: { empid: true, name: true, role: true }
        }
      },
      orderBy: { report_date: 'desc' }
    });

    const leaves = await prisma.leave_requests.findMany({
      where: { empid },
      select: {
        id: true, from_date: true, to_date: true,
        leave_type: true, status: true, reason: true
      }
    });

    return NextResponse.json({ reports, employee, leaves }, { status: 200 });
  } catch (error) {
    console.error("Error fetching employee work reports:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

