import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper: Generate unique filename with increment
function generateUniqueFilename(uploadDir, baseName, ext) {
  let filename = `${baseName}${ext}`;
  let counter = 1;

  while (fs.existsSync(path.join(uploadDir, filename))) {
    filename = `${baseName}_${counter}${ext}`;
    counter++;
  }

  return filename;
}

const uploadDir = path.join(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = `${req.body.candidate_id}_${file.fieldname}_${Date.now()}`;
    const uniqueName = generateUniqueFilename(uploadDir, baseName, ext);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Wrap multer with promise for Next.js API
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    await runMiddleware(req, res, upload.fields([
      { name: 'aadhar_card', maxCount: 1 },
      { name: 'pan_card', maxCount: 1 },
      { name: 'education_certificates', maxCount: 1 },
      { name: 'resume', maxCount: 1 },
      { name: 'experience_certificate', maxCount: 1 },
      { name: 'profile_photo', maxCount: 1 },
      { name: 'bank_details', maxCount: 1 }
    ]));

    const body = req.body;
    const files = req.files;

    const password = uuidv4().split('-')[0];

    // Create employee
    const employee = await prisma.employees.create({
      data: {
        candidate_id: body.candidate_id,
        name: body.name,
        email: body.email,
        contact_no: body.contact_no,
        password,
        gender: body.gender,
        dob: body.dob ? new Date(body.dob) : null,
        aadhar_card: files.aadhar_card ? `/uploads/${files.aadhar_card[0].filename}` : null,
        pan_card: files.pan_card ? `/uploads/${files.pan_card[0].filename}` : null,
        education_certificates: files.education_certificates ? `/uploads/${files.education_certificates[0].filename}` : null,
        resume: files.resume ? `/uploads/${files.resume[0].filename}` : null,
        experience_certificate: files.experience_certificate ? `/uploads/${files.experience_certificate[0].filename}` : null,
        profile_photo: files.profile_photo ? `/uploads/${files.profile_photo[0].filename}` : null,
        aadhar_number: body.aadhar_number,
        pan_number: body.pan_number,
      }
    });

    // Create bank_details
    await prisma.bank_details.create({
      data: {
        employee_id: employee.empid,
        account_holder_name: body.account_holder_name,
        bank_name: body.bank_name,
        branch_name: body.branch_name,
        account_number: body.account_number,
        ifsc_code: body.ifsc_code,
        checkbook_document: files.bank_details ? `/uploads/${files.bank_details[0].filename}` : null,
      }
    });

    // Create address
    await prisma.addresses.create({
      data: {
        employee_id: employee.empid,
        address_line1: body.address_line_1,
        address_line2: body.address_line_2,
        city: body.city,
        state: body.state,
        country: body.country,
        pincode: body.pincode,
      }
    });

    return res.status(200).json({
      message: 'Form submitted successfully',
      password,
    });

  } catch (err) {
    console.error('Error in form submission:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
