import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { DecodedToken } from "@/lib/jwtTypes";
import cookie from "cookie";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  

  try {
    const { token } = cookie.parse(req.headers.get('cookie') || "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    
    let user = null;
    let attendance = null;
    let retries = 3;
    
    while (retries > 0) {
      try {
        await prisma.$connect();
        
        user = await prisma.users.findUnique({
          where: { empid: (decoded.empid || decoded.id) as string },
          select: { empid: true }
        });

        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        attendance = await prisma.attendance.findFirst({
          where: {
            empid: user.empid,
            date: { gte: today }
          },
          orderBy: { date: "desc" }
        });
        
        break;
      } catch (dbError) {
        retries--;
        if (retries === 0) throw dbError;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const isWorking = !!(attendance?.check_in && !attendance?.check_out);
    const workStartTime = attendance?.check_in || null;

    return NextResponse.json({ isWorking, workStartTime }, { status: 200 });
  } catch (err) {
    console.error("Work status error:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  } finally {
    await prisma.$disconnect();
  }
}


