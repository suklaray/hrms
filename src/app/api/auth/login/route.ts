import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import crypto from "crypto";
import { rateLimiter } from "@/lib/rateLimiter";
import { createSession } from "@/lib/authMiddleware";
import { SESSION_CONFIG, SESSION_TIMEOUT_MS } from "@/lib/sessionConfig";

export async function POST(req: NextRequest) {
  const allow = rateLimiter()(req);
  if (!allow) {
    return NextResponse.json({ message: "Too many login attempts. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ message: "Email/Username and password are required" }, { status: 400 });
  }

  try {
    let user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.users.findUnique({ where: { empid: email } });
    }
    if (!user) {
      return NextResponse.json({ message: "Invalid email" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ message: "Invalid password" }, { status: 401 });
    }

    const employee = await prisma.employees.findUnique({ where: { email: user.email } });
    let hasFormSubmitted = !!employee;

    if (!hasFormSubmitted && user.candidate_id) {
      const candidate = await prisma.candidates.findUnique({
        where: { candidate_id: user.candidate_id },
      });
      hasFormSubmitted = candidate?.form_submitted === true;
    }

    if (!hasFormSubmitted) {
      hasFormSubmitted = true;
    }

    const payload = {
      id: user.id,
      empid: user.empid,
      name: user.name,
      role: user.role,
      roleId: user.roleId ?? null,
      email: user.email,
      verified: user.verified,
      form_submitted: hasFormSubmitted,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "12h" });
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS);

    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expiresAt,
        lastActivity: new Date(),
      },
    });

    createSession(user.id, user.role === "employee" ? "employee" : "admin");

    const response = NextResponse.json({ message: "Login successful", token, user: payload }, { status: 200 });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: Math.floor(SESSION_CONFIG.JWT_EXPIRY / 1000),
      path: "/",
    });

    response.cookies.set("sessionToken", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: Math.floor(SESSION_TIMEOUT_MS / 1000),
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ message: "Error logging in", error: error?.message }, { status: 500 });
  }
}
