import prisma from "@/lib/prisma";
import crypto from "crypto";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
    }

  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      return res.status(200).json({ message: "If this email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 15); 

    await prisma.users.update({
      where: { email },
      data: { resetToken: token, resetTokenExpiry: expiry }
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
await transporter.sendMail({
  from: `"HRMS Support" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: "Password Reset",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 900px; margin: auto; padding: 5px; border: 1px solid #ddd; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 20px;">
       <img src="https://i.ibb.co/dwzSzPKt/hr.jpg" alt="hr" border="0">
      <h2 style="color: #4f46e5;">Reset Your Password</h2>
      <p>Hello,</p>
      <p pl-6 pr-6>We received a request to reset your password. Click the button below to set a new password. This link will expire in <strong>15 minutes</strong>.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #4f46e5; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 5px; display: inline-block;">Reset Password</a>
      </div>
      <p>If you didn’t request this, please ignore this email.</p>
      <p style="font-size: 12px; color: #888;">&copy; ${new Date().getFullYear()} HRMS. All rights reserved.</p>
    </div>
  `
});

    res.status(200).json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}
