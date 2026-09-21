import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  

  const { token, password } = body;
  if (!token || !password)
    return NextResponse.json({ message: "Token and password are required" }, { status: 400 });

  // Password strength check
  const passwordRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/;
  if (!passwordRules.test(password)) {
    return NextResponse.json({
      message:
        "Password must be at least 8 characters long, include uppercase, lowercase, and a number or special character."
    }, { status: 400 });
  }

  try {
    const user = await prisma.users.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gte: new Date() }
      }
    });

    if (!user)
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);

    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return NextResponse.json({ message: "Password reset successful. Please log in." }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Something went wrong. Please try again." }, { status: 500 });
  }
}


