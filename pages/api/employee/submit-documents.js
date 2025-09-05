import { formidable } from 'formidable';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const form = formidable({
    maxFileSize: 10 * 1024 * 1024, // 10MB limit
    keepExtensions: true,
  });

  try {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parsing error:', err);
        return res.status(500).json({ error: 'File upload failed' });
      }

      try {
        // Extract field values
        const getValue = (field) => Array.isArray(field) ? field[0] : field;
        
        const body = {
          empid: getValue(fields.empid),
          name: getValue(fields.name),
          email: getValue(fields.email),
          contact_no: getValue(fields.contact_no),
          gender: getValue(fields.gender),
          dob: getValue(fields.dob),
          address_line_1: getValue(fields.address_line_1),
          address_line_2: getValue(fields.address_line_2),
          city: getValue(fields.city),
          state: getValue(fields.state),
          country: getValue(fields.country),
          pincode: getValue(fields.pincode),
          highest_qualification: getValue(fields.highest_qualification),
          aadhar_number: getValue(fields.aadhar_number),
          pan_number: getValue(fields.pan_number),
          account_holder_name: getValue(fields.account_holder_name),
          bank_name: getValue(fields.bank_name),
          branch_name: getValue(fields.branch_name),
          account_number: getValue(fields.account_number),
          ifsc_code: getValue(fields.ifsc_code),
        };

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Helper function to process file
        const processFile = (file) => {
          if (!file) return null;
          const fileName = `${Date.now()}-${file.originalFilename}`;
          const finalPath = path.join(uploadsDir, fileName);
          fs.renameSync(file.filepath, finalPath);
          return `/uploads/${fileName}`;
        };

        // Process all files
        const aadharPath = processFile(files.aadhar_card?.[0] || files.aadhar_card);
        const panPath = processFile(files.pan_card?.[0] || files.pan_card);
        const educationPath = processFile(files.education_certificates?.[0] || files.education_certificates);
        const resumePath = processFile(files.resume?.[0] || files.resume);
        const experiencePath = processFile(files.experience_certificate?.[0] || files.experience_certificate);
        const profilePath = processFile(files.profile_photo?.[0] || files.profile_photo);
        const bankPath = processFile(files.bank_details?.[0] || files.bank_details);

        // Update users table name if needed
        await prisma.users.updateMany({
          where: { email: body.email },
          data: { name: body.name }
        });

        // Update or create employee record
        const employee = await prisma.employees.upsert({
          where: { email: body.email },
          update: {
            name: body.name,
            contact_no: body.contact_no,
            gender: body.gender,
            dob: body.dob ? new Date(body.dob) : null,
            highest_qualification: body.highest_qualification,
            aadhar_number: body.aadhar_number,
            pan_number: body.pan_number,
            aadhar_card: aadharPath,
            pan_card: panPath,
            education_certificates: educationPath,
            resume: resumePath,
            experience_certificate: experiencePath,
            profile_photo: profilePath,
          },
          create: {
            name: body.name,
            email: body.email,
            contact_no: body.contact_no,
            gender: body.gender,
            dob: body.dob ? new Date(body.dob) : null,
            highest_qualification: body.highest_qualification,
            aadhar_number: body.aadhar_number,
            pan_number: body.pan_number,
            aadhar_card: aadharPath,
            pan_card: panPath,
            education_certificates: educationPath,
            resume: resumePath,
            experience_certificate: experiencePath,
            profile_photo: profilePath,
          }
        });

        // Update or create bank details
        const existingBankDetails = await prisma.bank_details.findFirst({
          where: { employee_id: employee.empid }
        });
        
        if (existingBankDetails) {
          await prisma.bank_details.update({
            where: { id: existingBankDetails.id },
            data: {
              account_holder_name: body.account_holder_name,
              bank_name: body.bank_name,
              branch_name: body.branch_name,
              account_number: body.account_number,
              ifsc_code: body.ifsc_code,
              checkbook_document: bankPath,
            }
          });
        } else {
          await prisma.bank_details.create({
            data: {
              employee_id: employee.empid,
              account_holder_name: body.account_holder_name,
              bank_name: body.bank_name,
              branch_name: body.branch_name,
              account_number: body.account_number,
              ifsc_code: body.ifsc_code,
              checkbook_document: bankPath,
            }
          });
        }

        // Update or create address
        const existingAddress = await prisma.addresses.findFirst({
          where: { employee_id: employee.empid }
        });
        
        if (existingAddress) {
          await prisma.addresses.update({
            where: { id: existingAddress.id },
            data: {
              address_line1: body.address_line_1,
              address_line2: body.address_line_2,
              city: body.city,
              state: body.state,
              country: body.country,
              pincode: body.pincode,
            }
          });
        } else {
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
        }

        return res.status(200).json({
          message: 'Documents submitted successfully',
          employee_id: employee.empid
        });

      } catch (err) {
        console.error('Error in document submission:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
      }
    });
  } catch (error) {
    console.error('Form parsing failed:', error);
    return res.status(500).json({ error: 'Form parsing failed' });
  }
}