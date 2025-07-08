import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const {
    name,
    email,
    position,
    date_of_joining,
    status,
    experience,
    employee_type,
    role = "employee",
  } = req.body;

  if (!name || !email || !employee_type) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and employee type are required.",
    });
  }

  try {
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered.",
      });
    }

    const empid = `${name.substring(0, 2).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
    const rawPassword = uuidv4().slice(0, 8); // Secure 8-char password
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    await prisma.users.create({
      data: {
        empid,
        name,
        email,
        password: hashedPassword,
        position: position || null,
        date_of_joining: date_of_joining ? new Date(date_of_joining) : null,
        status: status || "Active",
        experience: experience ? parseInt(experience) : null,
        role,
        employee_type,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Employee registered successfully with ID ${empid}`,
      empid,
      password: rawPassword, // Only sent once
    });

  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
}
