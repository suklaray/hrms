import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed" });

  const { candidateId } = req.body;

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { candidate_id: candidateId },
    });

    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    const transporter = nodemailer.createTransport({
      service: "gmail",
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
        <a href="${candidate.form_link}" target="_blank">Submit Documents</a>
        <p>Best regards,<br/>HR Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    await prisma.candidate.update({
      where: { candidate_id: candidateId },
      data: { form_status: "Form Mail Sent" },
    });

    res.status(200).json({ message: "Form submission email sent successfully." });

  } catch (error) {
    console.error("Error sending form mail:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await prisma.$disconnect();
  }
}
