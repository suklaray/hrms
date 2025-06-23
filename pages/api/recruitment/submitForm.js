import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const uploadDir = path.join(process.cwd(), '/public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = formidable({
    uploadDir,
    keepExtensions: true,
    multiples: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      return res.status(500).json({ error: 'Error parsing form data' });
    }

    try {
      const candidate_id = fields.candidate_id?.[0];
      const name = fields.name?.[0];
      const email = fields.email?.[0];
      const contact_no = fields.contact_no?.[0];
      const address = fields.address?.[0];
      const gender = fields.gender?.[0];
      const dob = fields.dob?.[0];
      const bank_details = fields.bank_details?.[0];
      const password = uuidv4().split('-')[0];

      const getFilePath = (file) =>
        file && file[0] ? `/uploads/${path.basename(file[0].filepath)}` : null;

      const filePaths = {
        aadhar_card: getFilePath(files.aadhar_card),
        pan_card: getFilePath(files.pan_card),
        education_certificates: getFilePath(files.education_certificates),
        resume: getFilePath(files.resume),
        experience_certificate: getFilePath(files.experience_certificate),
        profile_photo: getFilePath(files.profile_photo),
      };

      console.log("File paths:", filePaths); // Debugging info

      await db.execute(
        `INSERT INTO employees (
          candidate_id, name, email, contact_no, password, address, gender, dob,
          aadhar_card, pan_card, education_certificates, resume, experience_certificate,
          bank_details, profile_photo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          candidate_id,
          name,
          email,
          contact_no,
          password,
          address,
          gender,
          dob,
          filePaths.aadhar_card,
          filePaths.pan_card,
          filePaths.education_certificates,
          filePaths.resume,
          filePaths.experience_certificate,
          bank_details,
          filePaths.profile_photo,
        ]
      );

      return res.status(200).json({ message: 'Form submitted and data saved.' });
    } catch (error) {
      console.error('Error saving form data:', error);
      return res.status(500).json({ error: 'Error saving form data' });
    }
  });
}