import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const form = new IncomingForm();
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  form.uploadDir = uploadDir;
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ message: 'Form parsing error' });

    const { empid, name, leave_type, from_date, to_date, reason } = fields;
    const attachment = files.attachment ? `/uploads/${path.basename(files.attachment.filepath)}` : null;

    try {
      await prisma.leave_requests.create({
        data: {
          empid: empid,
          name: name,
          leave_type: leave_type,
          from_date: new Date(from_date),
          to_date: new Date(to_date),
          reason: reason,
          attachment: attachment,
        },
      });
      res.status(200).json({ message: 'Leave request submitted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Database error' });
    }
  });
}
