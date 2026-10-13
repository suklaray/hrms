import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });
}

export async function sendShortlistMail(to: string, name: string) {
  await createTransporter().sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Congratulations! You've Been Shortlisted",
    html: `
      <p>Dear ${name},</p>
      <p>We are pleased to inform you that your application has been reviewed and you have been <strong>shortlisted</strong> for the next stage of our recruitment process.</p>
      <p>Our team will be in touch shortly with further details regarding the next steps.</p>
      <br/>
      <p>Best regards,</p>
      <p>HR Team</p>
    `,
  });
}

export async function sendInterviewScheduleMail(
  to: string,
  name: string,
  interviewDate: string,
  timeFrom: string,
  timeTo: string
) {
  await createTransporter().sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Interview Scheduled – Please Confirm Your Availability",
    html: `
      <p>Dear ${name},</p>
      <p>Your interview has been scheduled. Please find the details below:</p>
      <table style="border-collapse:collapse;margin:12px 0;">
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Date</td><td>${new Date(interviewDate).toDateString()}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Time</td><td>${timeFrom} – ${timeTo}</td></tr>
      </table>
      <p>Please ensure you are available at the scheduled time. If you have any questions, feel free to reach out to us.</p>
      <br/>
      <p>Best regards,</p>
      <p>HR Team</p>
    `,
  });
}

export async function sendRejectionMail(to: string, name: string, reason: string) {
  await createTransporter().sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Update on Your Application",
    html: `
      <p>Dear ${name},</p>
      <p>Thank you for taking the time to apply and for your interest in joining our team.</p>
      <p>After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>We appreciate the effort you put into your application and encourage you to apply for future openings that match your profile.</p>
      <br/>
      <p>Best regards,</p>
      <p>HR Team</p>
    `,
  });
}
