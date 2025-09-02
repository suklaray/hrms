import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { verifyEmployeeToken } from '@/lib/auth';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const user = await verifyEmployeeToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const form = formidable({ 
    keepExtensions: true,
    uploadDir: uploadDir
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Form parsing error:", err);
      return res.status(500).json({ message: 'Form parsing error' });
    }

    const leave_type = Array.isArray(fields.leave_type) ? fields.leave_type[0] : fields.leave_type;
    const reason = Array.isArray(fields.reason) ? fields.reason[0] : fields.reason;
    const from_date = new Date(Array.isArray(fields.from_date) ? fields.from_date[0] : fields.from_date);
    const to_date = new Date(Array.isArray(fields.to_date) ? fields.to_date[0] : fields.to_date);

    let attachment = null;
    const file = Array.isArray(files.attachment) ? files.attachment[0] : files.attachment;
    
    if (file && file.filepath) {
      const fileName = `${Date.now()}-${file.originalFilename}`;
      const finalPath = path.join(uploadDir, fileName);
      fs.renameSync(file.filepath, finalPath);
      attachment = `/uploads/${fileName}`;
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
        },
      });

      res.status(200).json({ message: 'Leave request submitted successfully' });
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).json({ message: 'Database error' });
    }
  });
}
