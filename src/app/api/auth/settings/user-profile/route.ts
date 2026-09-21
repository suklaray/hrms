import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const cookies = cookie.parse(req.headers.get('cookie') || "");
  const token = cookies.token;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid },
      select: {
        empid: true,
        name: true,
        email: true,
        profile_photo: true,
        role: true,
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let profilePic = user.profile_photo;
    
    if (!profilePic) {
      const employee = await prisma.employees.findFirst({
        where: { email: user.email },
        select: { profile_photo: true }
      });
      profilePic = employee?.profile_photo;
    }

    return NextResponse.json({
      empid: user.empid,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: profilePic || null,
    }, { status: 200 });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
