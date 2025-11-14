import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { empid, password, role } = req.body;

  if (!empid || !password) {
    return res.status(400).json({ error: 'Employee ID and password are required' });
  }

  try {
    // Get employee details from users table (empid is string there)
    const employee = await prisma.users.findUnique({
      where: { empid: empid }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Determine what to show as username based on role
    const displayUsername = role?.toLowerCase() === 'employee' ? empid : employee.email;

    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: `"HR Team" <${process.env.EMAIL_USER}>`,
      to: employee.email,
      subject: 'Your Updated HRMS Login Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">HRMS Login Credentials</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0;">Your password has been updated</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear ${employee.name},</p>
            
            <p style="color: #555; line-height: 1.6;">Your HRMS account password has been updated by the administrator. Please use the following credentials to access your account:</p>
            
            <div style="background: white; border: 2px solid #e9ecef; border-radius: 8px; padding: 25px; margin: 25px 0;">
              <div style="margin-bottom: 15px;">
                <strong style="color: #495057;">Username:</strong>
                <span style="background: #e9ecef; padding: 5px 10px; border-radius: 4px; font-family: monospace; margin-left: 10px;">${displayUsername}</span>
              </div>
              <div>
                <strong style="color: #495057;">New Password:</strong>
                <span style="background: #e9ecef; padding: 5px 10px; border-radius: 4px; font-family: monospace; margin-left: 10px;">${password}</span>
              </div>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ Important Security Notice:</strong><br>
                • Please change your password after your first login<br>
                • Do not share your credentials with anyone<br>
                • Keep your login information secure
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Login to HRMS
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              If you have any questions or need assistance, please contact the HR department or IT support.
            </p>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 25px 0;">
            
            <p style="color: #888; font-size: 12px; text-align: center; margin: 0;">
              This is an automated message from the HRMS system. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    
    res.status(200).json({ 
      success: true, 
      message: 'Credentials sent successfully to employee email' 
    });

  } catch (error) {
    console.error('Error sending credentials:', error);
    res.status(500).json({ error: 'Failed to send credentials' });
  } finally {
    await prisma.$disconnect();
  }
}