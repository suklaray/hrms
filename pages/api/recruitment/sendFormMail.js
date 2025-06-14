import nodemailer from "nodemailer";
import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed" });

  const { candidateId } = req.body;

  try {
    const [rows] = await db.query("SELECT email, name, form_link FROM candidates WHERE candidate_id = ?", [candidateId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const candidate = rows[0];

    // Setup of mail transporter
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
        <a href="${candidate.form_link}" target="_blank" style="color: blue;">Submit Documents</a>
        <p>Best regards,<br/>HR Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    // Updated column name to match DB schema
    await db.query("UPDATE candidates SET form_status = ? WHERE candidate_id = ?", [
      "Form Mail Sent",
      candidateId,
    ]);

    res.status(200).json({ message: "Form submission email sent successfully." });
  } catch (error) {
    console.error("Error sending form mail:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
