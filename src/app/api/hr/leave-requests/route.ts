import { NextRequest, NextResponse } from "next/server";
// /pages/api/hr/leave-requests.js
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import type { DecodedToken } from "@/lib/jwtTypes";
import cookie from "cookie";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  

  try {
    // Get user from token
    const cookies = cookie.parse(req.headers.get('cookie') || '');
    const { token } = cookies;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.LEAVE_VIEW);
    if (!hasAccess) {
      return NextResponse.json({ message: 'Unauthorized: insufficient permissions' }, { status: 403 });
    }

    const currentUser = await prisma.users.findUnique({
      where: { empid: (decoded.empid || decoded.id) as string },
      select: { empid: true, role: true }
    });

    const leaveRequests = await prisma.leave_requests.findMany({
      include: {
        users: {
          select: {
            status: true,
            role: true,
            email: true 
          }
        }
      },
      orderBy: {
        applied_at: 'desc', 
      },
    });

    // Filter out inactive employees
    const filteredLeaveRequests = leaveRequests.filter(req => 
      req.users && req.users.status !== 'Inactive'
    );

    // Add pending leave count for each employee
    const leaveRequestsWithCount = await Promise.all(
      filteredLeaveRequests.map(async (leave) => {
        const pendingCount = await prisma.leave_requests.count({
          where: {
            empid: leave.empid,
            status: 'Pending'
          }
        });
        return {
          ...leave,
          pendingCount
        };
      })
    );

    return NextResponse.json({ success: true, data: leaveRequestsWithCount }, { status: 200 });
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}



