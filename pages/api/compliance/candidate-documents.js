import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hasAccess =
      (await checkPermission(decoded, PERMISSION_KEYS.COMPLIANCE_VIEW_DOCUMENTS)) ||
      (await checkPermission(decoded, PERMISSION_KEYS.COMPLIANCE_VIEW));
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Reconnect to database if connection is lost
    await prisma.$connect();
    
    // Get employee documents using email
    const employee = await prisma.employees.findUnique({
      where: { email },
      select: {
        aadhar_card: true,
        pan_card: true,
        bank_details: true,
        experience_certificate: true,
        resume: true,
        education_certificates: true
      }
    });

    // Return empty object if employee not found (candidate might not be in employees table yet)
    if (!employee) {
      return res.status(200).json({
        aadhar_card: null,
        pan_card: null,
        bank_details: null,
        experience_certificate: null,
        resume: null,
        education_certificates: null
      });
    }

    res.status(200).json(employee);

  } catch (err) {
    console.error('Error fetching candidate documents:', err);
    
    // If it's a connection error, try to reconnect
    if (err.code === 'P1017') {
      try {
        await prisma.$disconnect();
        await prisma.$connect();
        return res.status(500).json({ 
          message: 'Database connection lost. Please try again.',
          aadhar_card: null,
          pan_card: null,
          bank_details: null,
          experience_certificate: null,
          resume: null
        });
      } catch (reconnectErr) {
        console.error('Failed to reconnect:', reconnectErr);
      }
    }
    
    res.status(500).json({ 
      message: 'Internal server error',
      aadhar_card: null,
      pan_card: null,
      bank_details: null,
      experience_certificate: null,
      resume: null,
      education_certificates: null
    });
  } finally {
    await prisma.$disconnect();
  }
}