import { formidable } from 'formidable';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
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
    maxFileSize: 5 * 1024 * 1024, // 5MB limit
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
        candidate_id: getValue(fields.candidate_id),
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

      // Helper function to process file
      const processFile = (file) => {
        if (!file) return { data: null, filename: null, mimetype: null };
        const fileData = fs.readFileSync(file.filepath);
        return {
          data: fileData,
          filename: file.originalFilename,
          mimetype: file.mimetype
        };
      };

      // Process all files
      const aadharFile = processFile(files.aadhar_card?.[0] || files.aadhar_card);
      const panFile = processFile(files.pan_card?.[0] || files.pan_card);
      const educationFile = processFile(files.education_certificates?.[0] || files.education_certificates);
      const resumeFile = processFile(files.resume?.[0] || files.resume);
      const experienceFile = processFile(files.experience_certificate?.[0] || files.experience_certificate);
      const profileFile = processFile(files.profile_photo?.[0] || files.profile_photo);
      const bankFile = processFile(files.bank_details?.[0] || files.bank_details);

      const password = uuidv4().split('-')[0];

      // Create employee with file data stored as Bytes
      const employee = await prisma.employees.create({
        data: {
          candidate_id: body.candidate_id,
          name: body.name,
          email: body.email,
          contact_no: body.contact_no,
          password,
          gender: body.gender,
          dob: body.dob ? new Date(body.dob) : null,
          highest_qualification: body.highest_qualification,
          aadhar_number: body.aadhar_number,
          pan_number: body.pan_number,
          // Store file data as Bytes
          aadhar_card_data: aadharFile.data,
          aadhar_card_filename: aadharFile.filename,
          aadhar_card_mimetype: aadharFile.mimetype,
          pan_card_data: panFile.data,
          pan_card_filename: panFile.filename,
          pan_card_mimetype: panFile.mimetype,
          education_certificates_data: educationFile.data,
          education_certificates_filename: educationFile.filename,
          education_certificates_mimetype: educationFile.mimetype,
          resume_data: resumeFile.data,
          resume_filename: resumeFile.filename,
          resume_mimetype: resumeFile.mimetype,
          experience_certificate_data: experienceFile.data,
          experience_certificate_filename: experienceFile.filename,
          experience_certificate_mimetype: experienceFile.mimetype,
          profile_photo_data: profileFile.data,
          profile_photo_filename: profileFile.filename,
          profile_photo_mimetype: profileFile.mimetype,
        }
      });

      // Update candidate form submission status
      await prisma.candidates.update({
        where: {
          candidate_id: body.candidate_id,
        },
        data: {
          form_submitted: true,
        },
      });

      // Create bank details with file data
      await prisma.bank_details.create({
        data: {
          employee_id: employee.empid,
          account_holder_name: body.account_holder_name,
          bank_name: body.bank_name,
          branch_name: body.branch_name,
          account_number: body.account_number,
          ifsc_code: body.ifsc_code,
          checkbook_document_data: bankFile.data,
          checkbook_document_filename: bankFile.filename,
          checkbook_document_mimetype: bankFile.mimetype,
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
      return res.status(500).json({ error: err.message || 'Server error' });
    }
    });
  } catch (error) {
    console.error('Form parsing failed:', error);
    return res.status(500).json({ error: 'Form parsing failed' });
  }
}