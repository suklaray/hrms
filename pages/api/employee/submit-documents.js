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
    maxFileSize: 15 * 1024 * 1024, // 15MB limit
    maxTotalFileSize: 50 * 1024 * 1024, // 50MB total limit
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parsing error:', err);
      
      // Handle specific file size errors
      if (err.code === 1009) {
        return res.status(413).json({ 
          error: 'File size too large. Maximum total file size allowed is 50MB. Please compress your files and try again.' 
        });
      }
      
      if (err.code === 1016) {
        return res.status(413).json({ 
          error: 'Individual file size too large. Maximum file size allowed is 15MB per file.' 
        });
      }
      
      return res.status(400).json({ error: 'File upload failed. Please check your files and try again.' });
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

        // Security check: Prevent resubmission if already submitted
        const existingUser = await prisma.users.findUnique({
          where: { empid: body.empid },
          select: { form_submitted: true }
        });

        if (existingUser?.form_submitted) {
          return res.status(400).json({ 
            error: 'Documents already submitted. No further changes allowed.' 
          });
        }

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
          fs.copyFileSync(file.filepath, finalPath);
          fs.unlinkSync(file.filepath);
          return `/uploads/${fileName}`;
        };

        // Process files or use existing paths
        const aadharPath = processFile(files.aadhar_card?.[0] || files.aadhar_card) || getValue(fields.existing_aadhar_card);
        const panPath = processFile(files.pan_card?.[0] || files.pan_card) || getValue(fields.existing_pan_card);
        const educationPath = processFile(files.education_certificates?.[0] || files.education_certificates) || getValue(fields.existing_education_certificates);
        const resumePath = processFile(files.resume?.[0] || files.resume) || getValue(fields.existing_resume);
        const experiencePath = processFile(files.experience_certificate?.[0] || files.experience_certificate) || getValue(fields.existing_experience_certificate);
        const profilePath = processFile(files.profile_photo?.[0] || files.profile_photo) || getValue(fields.existing_profile_photo);
        const bankPath = processFile(files.bank_details?.[0] || files.bank_details) || getValue(fields.existing_bank_details);

        // Update users table with form details
        await prisma.users.updateMany({
          where: { email: body.email },
          data: { 
            name: body.name,
            contact_number: body.contact_no,
            form_submitted: true,
            ...(profilePath && { profile_photo: profilePath })
          }
        });
        // Get user data to fetch empid and candidate_id
        const user = await prisma.users.findUnique({
          where: { empid: body.empid },
          select: { empid: true, candidate_id: true }
        });

        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        // Update or create employee record
        const employee = await prisma.employees.upsert({
          where: { email: body.email },
          update: {
            main_employee_id: user.empid, 
            candidate_id: user.candidate_id,
            name: body.name,
            contact_no: body.contact_no,
            gender: body.gender,
            dob: body.dob ? new Date(body.dob) : null,
            highest_qualification: body.highest_qualification,
            aadhar_number: body.aadhar_number,
            pan_number: body.pan_number,
            ...(aadharPath && { aadhar_card: aadharPath }),
            ...(panPath && { pan_card: panPath }),
            ...(educationPath && { education_certificates: educationPath }),
            ...(resumePath && { resume: resumePath }),
            ...(experiencePath && { experience_certificate: experiencePath }),
            ...(profilePath && { profile_photo: profilePath }),
          },
          create: {
            main_employee_id: user.empid,  
            candidate_id: user.candidate_id,
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
              ...(bankPath && { checkbook_document: bankPath }),
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

        // Don't refresh JWT tokens to avoid session conflicts between different users/tabs

        res.status(200).json({
          message: 'Documents submitted successfully',
          employee_id: employee.empid
        });

      } catch (err) {
        console.error('Error in document submission:', err);
        res.status(500).json({ error: err.message || 'Server error' });
      }
    });
}