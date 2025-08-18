import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookie from "cookie";

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

    // Create JWT
    const payload = {
      id: user.id,
      empid: user.empid,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Set cookie
    res.setHeader("Set-Cookie", cookie.serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24,
      path: "/",
    }));

    res.status(200).json({ message: "Login successful" });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
