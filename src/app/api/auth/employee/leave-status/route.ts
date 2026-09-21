import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  const { email } = body;

  try {
    const user = await prisma.users.findUnique({
      where: { email },
      select: { empid: true },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const requests = await prisma.leave_requests.findMany({
      where: { empid: user.empid },
      orderBy: { applied_at: "desc" },
      select: {
        from_date: true,
        to_date: true,
        reason: true,
        status: true,
      },
    });

    const leaveStatus = requests.map((req) => ({
      date: `${req.from_date} to ${req.to_date}`,
      reason: req.reason,
      status: req.status,
    }));

    return NextResponse.json({ leaveStatus }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch leave status" }, { status: 500 });
  }
}
