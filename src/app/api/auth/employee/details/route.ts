import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user || user.role !== "employee") {
      return NextResponse.json({ error: "Unauthorized: Invalid credentials or role" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized: Invalid credentials or role" }, { status: 401 });
    }

    const payload = {
      id: user.id,
      empid: user.empid,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "1d" });

    const response = NextResponse.json({ message: "Login successful" }, { status: 200 });

    response.headers.set("Set-Cookie", cookie.serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    }));

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
