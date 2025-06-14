import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import db from '@/lib/db';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const form = new IncomingForm();
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');

  // Creating the upload directory if it doesn't exist
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  form.uploadDir = uploadDir;
  form.keepExtensions = true;

  // Parse the form data
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ message: 'Form parsing error' });

    // Extract data from fields and files
    const { empid, name, leave_type, from_date, to_date, reason } = fields;
    const attachment = files.attachment ? `/uploads/${path.basename(files.attachment.filepath)}` : null;

    try {
      // Insert data into the leave_requests table
      await db.query(
        'INSERT INTO leave_requests (empid, name, leave_type, from_date, to_date, reason, attachment) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [empid, name, leave_type, from_date, to_date, reason, attachment]
      );
      res.status(200).json({ message: 'Leave request submitted successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Database error' });
    }
  });
}
