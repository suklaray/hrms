import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { name, email, password } = req.body;

  //const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

  const emailRegex = /^[a-z0-9._%+-]+@gmail\.com$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format." });
  }

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const empid = `${name.toLowerCase().replace(/\s/g, "")}_${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    const tokenPayload = { empid, name, email };
    let token;

    try {
      token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: "7d" });
    } catch (err) {
      return res.status(500).json({ message: "Token generation failed." });
    }

    const newUser = await prisma.users.create({
      data: { empid, name, email, password: hashedPassword },
    });

    try {
      res.setHeader("Set-Cookie", cookie.serialize("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      }));
    } catch (err) {
      await prisma.users.delete({ where: { email } });
      return res.status(500).json({ message: "Failed to set cookie." });
    }

    return res.status(201).json({ message: "Signup successful!", user: { empid, name, email } });

  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
