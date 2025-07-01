import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  const { token, password } = req.body;
  if (!token || !password)
    return res
      .status(400)
      .json({ message: "Token and password are required" });

  // Password strength check
  const passwordRules = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/;
  if (!passwordRules.test(password)) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters long, include uppercase, lowercase, and a number or special character."
    });
  }

  try {
    const user = await prisma.users.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gte: new Date() }
      }
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    const hashed = await bcrypt.hash(password, 10);

    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.status(200).json({ message: "Password reset successful. Please log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}
