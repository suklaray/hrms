import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import type { DecodedToken } from "@/lib/jwtTypes";
import cookie from "cookie";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  

  try {
    const cookies = cookie.parse(req.headers.get('cookie') || "");
    const token = cookies.token;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid as string },
      select: { email: true }
    });

    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    const employee = await prisma.employees.findFirst({
      where: { email: user.email },
      select: {
        aadhar_card: true,
        pan_card: true,
        resume: true,
        profile_photo: true,
        education_certificates: true,
      }
    });

    const requiredDocs = [
      employee?.aadhar_card,
      employee?.pan_card, 
      employee?.resume,
      employee?.profile_photo,
      employee?.education_certificates
    ];

    const submittedCount = requiredDocs.filter(doc => doc && doc.trim() !== '').length;
    const submitted = submittedCount >= 4;

    return NextResponse.json({ submitted }, { status: 200 });
  } catch (error) {
    console.error("Error checking document status:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}



