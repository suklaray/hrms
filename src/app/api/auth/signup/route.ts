import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, email, password } = body;

  const emailRegex = /^[a-z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ message: "Invalid email format." }, { status: 400 });
  }

  if (!name || !email || !password) {
    return NextResponse.json({ message: "All fields are required." }, { status: 400 });
  }

  try {
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "User already exists." }, { status: 400 });
    }

    const empid = `${name.toLowerCase().replace(/\s/g, "")}_${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    const tokenPayload = { empid, name, email };
    let token: string;

    try {
      token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: "7d" });
    } catch {
      return NextResponse.json({ message: "Token generation failed." }, { status: 500 });
    }

    await prisma.users.create({
      data: { empid, name, email, password: hashedPassword },
    });

    const response = NextResponse.json({ message: "Signup successful!", user: { empid, name, email } }, { status: 201 });

    response.headers.set("Set-Cookie", cookie.serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    }));

    return response;
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json({ message: "Error registering user", error: error?.message }, { status: 500 });
  }
}
