import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import type { DecodedToken } from "@/lib/jwtTypes";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // Get all leave types
    const leaveTypes = await prisma.leave_types.findMany({
      select: {
        id: true,
        type_name: true,
        max_days: true
      }
    });

    // Get approved leaves for this user
    const approvedLeaves = await prisma.leave_requests.findMany({
      where: {
        empid: decoded.empid as string,
        status: 'Approved'
      },
      select: {
        leave_type: true,
        from_date: true,
        to_date: true
      }
    });

    // Calculate balance for each leave type
    const balances = leaveTypes.map(leaveType => {
      const displayName = leaveType.type_name.replace(/_/g, ' ');
      
      const usedDays = approvedLeaves
        .filter(leave => leave.leave_type === displayName)
        .reduce((total, leave) => {
          const fromDate = new Date(leave.from_date);
          const toDate = new Date(leave.to_date);
          const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          return total + days;
        }, 0);

      const remaining = leaveType.max_days - usedDays;

      return {
        type_name: leaveType.type_name,
        max_days: leaveType.max_days,
        used: usedDays,
        remaining: remaining > 0 ? remaining : 0
      };
    });

    return NextResponse.json(balances, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}



