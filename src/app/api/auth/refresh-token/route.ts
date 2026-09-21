import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { isSuperAdmin } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ message: "No token provided" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // Fetch updated user data
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid }
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
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

    // For non-candidate users or superadmin, form submission is satisfied
    if (!hasFormSubmitted && (isSuperAdmin(user) || !user.candidate_id || user.form_submitted)) {
      hasFormSubmitted = true;
    }

    // Create new JWT with updated data
    const payload = {
      id: user.id,
      empid: user.empid,
      name: user.name,
      email: user.email,
      role: user.role,
      roleId: user.roleId ?? null,
      verified: user.verified,
      form_submitted: hasFormSubmitted,
    };

    const newToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "1d" });

    const response = NextResponse.json({ message: "Token refreshed successfully" }, { status: 200 });

    response.headers.set("Set-Cookie", cookie.serialize("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    }));

    return response;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
