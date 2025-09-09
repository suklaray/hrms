import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let token = null;

  if (req.headers.cookie) {
    const parsed = cookie.parse(req.headers.cookie);
    token = parsed.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  // Restrict leave requests based on role hierarchy
  const userRole = user.role?.toLowerCase();
  
  if (userRole === 'superadmin') {
    return res.status(403).json({ message: 'Superadmin cannot apply for leave' });
  }
  
  if (userRole !== 'hr' && userRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const form = formidable({ 
    keepExtensions: true,
    uploadDir: uploadDir
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ message: 'Form parsing error' });
    }

    const leave_type = Array.isArray(fields.leave_type) ? fields.leave_type[0] : fields.leave_type;
    const reason = Array.isArray(fields.reason) ? fields.reason[0] : fields.reason;
    const from_date = Array.isArray(fields.from_date) ? fields.from_date[0] : fields.from_date;
    const to_date = Array.isArray(fields.to_date) ? fields.to_date[0] : fields.to_date;

    let attachment = null;
    const file = Array.isArray(files.attachment) ? files.attachment[0] : files.attachment;
    
    if (file && file.filepath) {
      const fileName = `hr-leave-${Date.now()}-${file.originalFilename}`;
      const finalPath = path.join(uploadDir, fileName);
      try {
        fs.copyFileSync(file.filepath, finalPath);
        fs.unlinkSync(file.filepath);
        attachment = `/uploads/${fileName}`;
      } catch (error) {
        console.error('File error:', error);
      }
    }

    try {
      await prisma.leave_requests.create({
        data: {
          empid: user.empid,
          name: user.name,
          leave_type,
          from_date: new Date(from_date),
          to_date: new Date(to_date),
          reason,
          attachment,
          status: 'Pending'
        },
      });

      res.status(200).json({ message: 'HR leave request submitted successfully' });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: 'Database error' });
    }
  });
}