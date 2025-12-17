import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "PUT")
    return res.status(405).json({ error: "Method not allowed" });

  const { candidateId } = req.body;

  try {
    const candidate = await prisma.candidates.findUnique({
      where: { candidate_id: candidateId },
    });

    if (!candidate)
      return res.status(404).json({ error: "Candidate not found" });

    // Generate token and update form link if not exists
    let formLink = candidate.form_link;
    if (!candidate.form_token) {
      const token = crypto.randomBytes(16).toString("hex");
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const host = req.headers.host;
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
      port: process.env.SMTP_PORT || 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
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

    res
      .status(200)
      .json({ message: "Form submission email sent successfully." });
  } catch (error) {
    console.error("FULL PROD ERROR:", error);
    return res
      .status(500)
      .json({ error: error.toString(), stack: error.stack });
  }
}
