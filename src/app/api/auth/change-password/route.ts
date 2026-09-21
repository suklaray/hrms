import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
// pages/api/auth/reset-password.js
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cookie from "cookie";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  

  const { newPassword } = body;

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
  }

  const cookies = cookie.parse(req.headers.get('cookie') || "");
  const token = cookies.token;

  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.users.update({
    where: { email: decoded.email },
    data: { password: hashedPassword },
  });

  return NextResponse.json({ message: "Password updated successfully" }, { status: 200 });
}


