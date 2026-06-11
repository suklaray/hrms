import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { rateLimiter } from "@/lib/rateLimiter";
import { createSession, SESSION_CONFIG } from "@/lib/authMiddleware";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const allow = rateLimiter()(req, res);
  if (!allow) return;

  const { email, password } = req.body;

  try {
    const user = await prisma.users.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: "Invalid email" });
    }

    // Checking role
    if (user.role !== "admin" && user.role !== "hr" && user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied: Only Admins and HRs can log in here" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid password" });
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
    
    // For admin/hr users who don't have employee records, set to true
    if (!hasFormSubmitted && ["admin", "hr", "superadmin"].includes(user.role)) {
      hasFormSubmitted = true;
    }

    const payload = {
      id: user.id,
      empid: user.empid,
      name: user.name,
      role: user.role,
      email: user.email,
      verified: user.verified,
      form_submitted: hasFormSubmitted,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: "12h" // 12 hours consistent with middleware
    });

    // Create server-side session with user type
    createSession(user.id, user.role === 'employee' ? 'employee' : 'admin');

    res.setHeader("Set-Cookie", cookie.serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: SESSION_CONFIG.JWT_EXPIRY / 1000, // Match JWT expiry
      path: "/",
    }));

    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Error logging in", error: error.message });
  }
}
