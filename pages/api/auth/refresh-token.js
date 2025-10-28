import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch updated user data
    const user = await prisma.users.findUnique({
      where: { empid: decoded.empid }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
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

    // Create new JWT with updated data
    const payload = {
      id: user.id,
      empid: user.empid,
      name: user.name,
      email: user.email,
      role: user.role,
      verified: user.verified,
      form_submitted: hasFormSubmitted,
    };

    const newToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Set new cookie
    res.setHeader("Set-Cookie", cookie.serialize("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    }));

    res.status(200).json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}