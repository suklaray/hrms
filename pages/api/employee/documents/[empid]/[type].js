import prisma from "@/lib/prisma";
import { verifyHRToken } from "@/lib/auth-hr";
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const user = await verifyHRToken(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { empid, type } = req.query;

  try {
    // Get employee data
    const employee = await prisma.employees.findFirst({
      where: { 
        user: { empid: empid }
      },
      include: {
        bank_details: true,
        user: true
      }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    let filePath = '';

    // Map document type to file path
    switch (type) {
      case 'aadhar':
        filePath = employee.aadhar_card;
        break;
      case 'pan':
        filePath = employee.pan_card;
        break;
      case 'resume':
        filePath = employee.resume;
        break;
      case 'experience':
        filePath = employee.experience_certificate;
        break;
      case 'checkbook':
        filePath = employee.bank_details?.[0]?.checkbook_document;
        break;
      default:
        return res.status(400).json({ message: 'Invalid document type' });
    }

    if (!filePath) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Construct full file path
    const fullPath = path.join(process.cwd(), 'public', filePath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Get file stats
    const stats = fs.statSync(fullPath);
    const fileExtension = path.extname(fullPath).toLowerCase();

    // Set appropriate content type
    let contentType = 'application/octet-stream';
    switch (fileExtension) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    }

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);

    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Document viewing error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}