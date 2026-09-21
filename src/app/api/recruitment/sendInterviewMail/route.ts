import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  const body = (await getRequestBody(req)) || {};
  const { candidateId, status } = body;

  try {
    // Fetch candidate from DB using Prisma
    const candidate = await prisma.candidates.findUnique({
      where: { candidate_id: candidateId },
    });

    if (!candidate) {
      return NextResponse.json({ message: "Candidate not found" }, { status: 404 });
    }

    // Configure nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: candidate.email,
      subject: "Interview Invitation - HRMS Recruitment",
      html: `
        <p>Dear ${candidate.name},</p>
        <p>You have been invited for an interview scheduled on <strong>${candidate.interview_date ? new Date(candidate.interview_date).toDateString() : ''}</strong>.</p>
        <p>Please be available accordingly.</p>
        <br/>
        <p>Best regards,</p>
        <p>HR Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Update candidate interview_mail_status using Prisma
    await prisma.candidates.update({
      where: { candidate_id: candidateId },
      data: { interview_mail_status: status },
    });

    return NextResponse.json({ message: "Interview mail sent" }, { status: 200 });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json({ message: "Error sending email" }, { status: 500 });
  }
}
