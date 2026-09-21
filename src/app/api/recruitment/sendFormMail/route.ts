import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { getRequestBody } from "@/lib/routeHelper";

export async function PUT(req: NextRequest) {
  const { candidateId } = (await getRequestBody(req)) || {};

  try {
    const candidate = await prisma.candidates.findUnique({
      where: { candidate_id: candidateId },
    });

    if (!candidate)
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

    // Generate token and update form link if not exists
    let formLink = candidate.form_link;
    if (!candidate.form_token) {
      const token = crypto.randomBytes(16).toString("hex");
      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const host = req.headers.get("host") || req.nextUrl.host;
      const baseUrl = `${protocol}://${host}`;
      formLink = `${baseUrl}/Recruitment/form/${token}`;

      await prisma.candidates.update({
        where: { candidate_id: candidateId },
        data: {
          form_link: formLink,
          form_token: token,
        },
      });
    }

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

    const mailOptions = {
      from: `"HR Team" <${process.env.EMAIL_USER}>`,
      to: candidate.email,
      subject: "Document Submission Form",
      html: `
        <p>Dear ${candidate.name},</p>
        <p>Please complete your document submission by filling out the form linked below:</p>
        <a href="${formLink}" target="_blank">Submit Documents</a>
        <p>Best regards,<br/>HR Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ message: "Form submission email sent successfully." }, { status: 200 });
  } catch (error: any) {
    console.error("FULL PROD ERROR:", error);
    return NextResponse.json({ error: error.toString(), stack: error.stack }, { status: 500 });
  }
}
