import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

function getAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return { error: NextResponse.json({ message: "Access denied" }, { status: 401 }) };
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return { decoded };
  } catch {
    return { error: NextResponse.json({ message: "Invalid token" }, { status: 403 }) };
  }
}

export async function GET(req: NextRequest) {
  const auth = getAuth(req);
  if (auth.error) return auth.error;
  const decoded = auth.decoded;

  try {
    const userEmpid = decoded.empid || decoded.id;
    const leaveRequests = await prisma.leave_requests.findMany({
      where: { empid: userEmpid },
      orderBy: { applied_at: 'desc' },
      select: {
        id: true,
        from_date: true,
        to_date: true,
        reason: true,
        resoan_to_reject: true,
        reason_to_cancel: true,
        leave_type: true,
        status: true,
        applied_at: true,
        attachment: true
      }
    });

    return NextResponse.json({
      success: true,
      leaveRequests
    }, { status: 200 });
  } catch (error) {
    console.error("Leave request API error:", error);
    return NextResponse.json({ 
      success: false,
      message: "Internal server error"
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuth(req);
  if (auth.error) return auth.error;
  const decoded = auth.decoded;

  try {
    const body = await req.json().catch(() => ({}));
    const { from_date, to_date, reason, leave_type, attachment } = body;

    if (!from_date || !to_date || !reason || !leave_type) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const userEmpid = decoded.empid || decoded.id;
    const user = await prisma.users.findUnique({
      where: { empid: userEmpid },
      select: { name: true, empid: true }
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const leaveRequest = await prisma.leave_requests.create({
      data: {
        empid: userEmpid,
        name: user.name,
        from_date: new Date(from_date),
        to_date: new Date(to_date),
        reason,
        leave_type,
        attachment: attachment || null,
        status: "Pending"
      }
    });

    return NextResponse.json({
      success: true,
      message: "Leave request submitted successfully",
      leaveRequest
    }, { status: 201 });
  } catch (error) {
    console.error("Leave request API error:", error);
    return NextResponse.json({ 
      success: false,
      message: "Internal server error"
    }, { status: 500 });
  }
}
