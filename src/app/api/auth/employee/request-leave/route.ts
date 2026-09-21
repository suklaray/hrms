import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  const { email, startDate, endDate, reason, leave_type, leaveType } = body;

  if (!email || !startDate || !endDate || !reason) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { email },
      select: { empid: true, name: true },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.leave_requests.create({
      data: {
        empid: user.empid,
        name: user.name,
        leave_type: leave_type || leaveType || "Casual Leave",
        from_date: new Date(startDate),
        to_date: new Date(endDate),
        reason,
      },
    });

    return NextResponse.json({ message: "Leave request submitted" }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
