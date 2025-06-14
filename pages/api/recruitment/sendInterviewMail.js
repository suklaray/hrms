import nodemailer from "nodemailer";
import pool from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "PUT")
    return res.status(405).json({ message: "Method not allowed" });

  const { candidateId, status } = req.body;

  try {
    const [rows] = await pool.query(
      "SELECT name, email, interview_date FROM candidates WHERE candidate_id = ?",
      [candidateId]
    );
    const candidate = rows[0];

    if (!candidate)
      return res.status(404).json({ message: "Candidate not found" });

    // Configure nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // App Password
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: candidate.email,
      subject: "Interview Invitation - HRMS Recruitment",
      html: `
        <p>Dear ${candidate.name},</p>
        <p>You have been invited for an interview scheduled on <strong>${candidate.interview_date}</strong>.</p>
        <p>Please be available accordingly.</p>
        <br/>
        <p>Best regards,</p>
        <p>HR Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

        await pool.query(
      "UPDATE candidates SET interview_mail_status = ? WHERE candidate_id = ?",
      [status, candidateId]
    );

    res.status(200).json({ message: "Interview mail sent" });
  } catch (error) {
    console.error("Email send error:", error);
    res.status(500).json({ message: "Error sending email" });
  }
}
