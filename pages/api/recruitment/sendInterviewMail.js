// /pages/api/recruitment/sendInterviewMail.js
import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { candidateId, status } = req.body;

  try {
    // Fetch candidate from DB using Prisma
    const candidate = await prisma.candidate.findUnique({
      where: { candidate_id: candidateId },
    });

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Configure nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: candidate.email,
      subject: "Interview Invitation - HRMS Recruitment",
      html: `
        <p>Dear ${candidate.name},</p>
        <p>You have been invited for an interview scheduled on <strong>${candidate.interview_date.toDateString()}</strong>.</p>
        <p>Please be available accordingly.</p>
        <br/>
        <p>Best regards,</p>
        <p>HR Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Update candidate interview_mail_status using Prisma
    await prisma.candidate.update({
      where: { candidate_id: candidateId },
      data: { interview_mail_status: status },
    });

    res.status(200).json({ message: "Interview mail sent" });
  } catch (error) {
    console.error("Email send error:", error);
    res.status(500).json({ message: "Error sending email" });
  } finally {
    await prisma.$disconnect();
  }
}
