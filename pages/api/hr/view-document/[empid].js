import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { empid, type } = req.query;

  if (!empid || !type) {
    return res.status(400).json({ error: 'Employee ID and document type are required' });
  }

  try {
    // Get user email from users table
    const user = await prisma.users.findUnique({
      where: { empid: empid },
      select: { email: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get document from employees table using email
    const employee = await prisma.employees.findFirst({
      where: { email: user.email },
      select: {
        resume: true,
        aadhar_card: true,
        pan_card: true,
        education_certificates: true,
        experience_certificate: true,
      },
    });

    if (!employee || !employee[type]) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const documentPath = employee[type].startsWith('/') ? employee[type].substring(1) : employee[type];
    const filePath = path.join(process.cwd(), 'public', documentPath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    let contentType = 'application/pdf';
    if (fileExt === '.jpg' || fileExt === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (fileExt === '.png') {
      contentType = 'image/png';
    } else if (fileExt === '.doc') {
      contentType = 'application/msword';
    } else if (fileExt === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${type}${fileExt}"`);
    res.send(fileBuffer);
    
  } catch (error) {
    console.error('Error serving document:', error);
    res.status(500).json({ error: 'Server error' });
  }
}