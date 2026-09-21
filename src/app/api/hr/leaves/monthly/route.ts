import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.LEAVE_VIEW);
    if (!hasAccess) {
      return NextResponse.json({ message: 'Access denied: insufficient permissions' }, { status: 403 });
    }

    const { empid, month, year } = query;

    if (!empid || !month || !year) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 });
    }

    // Get month number from month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNumber = monthNames.indexOf(month) + 1;

    if (monthNumber === 0) {
      return NextResponse.json({ message: 'Invalid month' }, { status: 400 });
    }

    // Get start and end dates for the month
    const startDate = new Date(parseInt(year), monthNumber - 1, 1);
    const endDate = new Date(parseInt(year), monthNumber, 0);

    // Fetch leave types to get paid status
    const leaveTypes = await prisma.leave_types.findMany({
      select: {
        type_name: true,
        paid: true
      }
    });

    // Create a map for quick lookup
    const leaveTypeMap = leaveTypes.reduce((acc, type) => {
      acc[type.type_name.toLowerCase()] = type.paid;
      return acc;
    }, {});

    // Fetch leave requests for the employee in the specified month
    const leaves = await prisma.leave_requests.findMany({
      where: {
        empid: empid,
        OR: [
          {
            from_date: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            to_date: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            AND: [
              { from_date: { lte: startDate } },
              { to_date: { gte: endDate } }
            ]
          }
        ]
      },
      orderBy: {
        from_date: 'desc'
      }
    });

    // Categorize leaves based on actual leave type configuration
    const approvedLeaves = leaves.filter(leave => leave.status === 'Approved');
    const paidLeaves = approvedLeaves.filter(leave => leaveTypeMap[leave.leave_type.toLowerCase()] === true);
    const unpaidLeaves = approvedLeaves.filter(leave => leaveTypeMap[leave.leave_type.toLowerCase()] === false);
    console.log('Leave Type Map:', leaveTypeMap);
    console.log('Approved Leaves:', approvedLeaves.map(l => ({ type: l.leave_type, paid: leaveTypeMap[l.leave_type] })));

    return NextResponse.json({
      approved: {
        count: approvedLeaves.length,
        leaves: approvedLeaves
      },
      paid: {
        count: paidLeaves.length,
        leaves: paidLeaves
      },
      unpaid: {
        count: unpaidLeaves.length,
        leaves: unpaidLeaves
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching monthly leaves:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}


