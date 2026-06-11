import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { createSession, SESSION_CONFIG } from "@/lib/authMiddleware";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email/Username and password are required" });
  }

  try {
    // Fetch user by email or empid
    let user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.users.findUnique({ where: { empid: email } });
    }
    console.log("Fetched user:", user);

    if (!user) {
      console.log("No user found with this email/username");
      return res.status(401).json({ message: "Invalid email/username or not authorized" });
    }

    if (user.role !== "employee") {
      console.log(`User role mismatch: expected 'employee', got '${user.role}'`);
      return res.status(401).json({ message: "Not authorized: role mismatch" });
    }

    // Validate password
    const isValid = await bcrypt.compare(password, user.password);
    console.log("Password valid:", isValid);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid password" });
    }

    // Check if user has submitted employee form
    let hasFormSubmitted = false;
    
    // Check employees table for document submission using email (more reliable)
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

    // Create JWT
    const payload = {
      id: user.id,
      empid: user.empid,
      name: user.name,
      email: user.email,
      role: user.role,
      verified: user.verified,
      form_submitted: hasFormSubmitted,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
      expiresIn: "12h" // 12 hours consistent with middleware
    });

    // Create server-side session with user type
    createSession(user.id, 'employee');

    // Set cookie
    res.setHeader("Set-Cookie", cookie.serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: SESSION_CONFIG.JWT_EXPIRY / 1000, // Match JWT expiry
      path: "/",
    }));

    res.status(200).json({ message: "Login successful" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
