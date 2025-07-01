import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
    password,
    role = "employee", // default role
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: "Name, email, and password are required" });
  }

  try {
    // Check if email exists
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // Generate empid (e.g., first 2 letters of name + random 4 digits)
    const empid = `${name.substring(0, 2).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.users.create({
      data: {
        empid,
        name,
        email,
        password: hashedPassword,
        position: position || null,
        date_of_joining: date_of_joining ? new Date(date_of_joining) : null,
        status: status || 'Active',
        experience: experience ? parseInt(experience) : null,
        role,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Employee registered successfully with ID ${empid}`,
      empid
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ success: false, message: "Database error" });
  }
}
