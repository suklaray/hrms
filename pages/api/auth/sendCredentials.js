import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, username, password, name } = req.body;

  if (!email || !username || !password || !name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
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
      to: email,
      subject: "Your HRMS Login Credentials",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Welcome to HRMS!</h2>
          <p>Dear ${name},</p>
          <p>Your employee account has been created successfully. Here are your login credentials:</p>
          
          <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Username:</strong> ${username}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          
          <p>Please keep these credentials secure and change your password after your first login.</p>
          <p>You can access the HRMS portal at: <a href="${
            process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
          }/login">Login Here</a></p>
          
          <p>Best regards,<br/>HR Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Credentials sent successfully" });
  } catch (error) {
    console.error("Error sending credentials:", error);
    res.status(500).json({ error: "Failed to send credentials" });
  }
}
