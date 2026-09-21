import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { rateLimiter } from "@/lib/rateLimiter";
import { createSession, SESSION_CONFIG } from "@/lib/authMiddleware";

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

    // Check if user has submitted employee form
    let hasFormSubmitted = false;
    
    // Check employees table for document submission using email
    const employee = await prisma.employees.findUnique({
      where: { email: user.email }
    });
    hasFormSubmitted = !!employee;
    
    // If not found in employees table and user came from candidate, check candidates table
    if (!hasFormSubmitted && user.candidate_id) {
      const candidate = await prisma.candidates.findUnique({
        where: { candidate_id: user.candidate_id }
      });
      hasFormSubmitted = candidate?.form_submitted === true;
    }
    
    // Default hasFormSubmitted for staff users
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

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { 
      expiresIn: "12h"
    });

    // Create server-side session with user type
    createSession(user.id, user.role === 'employee' ? 'employee' : 'admin');

    const response = NextResponse.json({ message: "Login successful", token, user: payload }, { status: 200 });

    response.headers.set("Set-Cookie", cookie.serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: SESSION_CONFIG.JWT_EXPIRY / 1000,
      path: "/",
    }));

    return response;
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ message: "Error logging in", error: error?.message }, { status: 500 });
  }
}
