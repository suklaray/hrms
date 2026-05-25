import { formidable } from 'formidable';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import { sendNotificationToUser } from '@/lib/notificationEmitter';

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

        // Check if this is a resubmission request (allow updates for resubmission)
        const isResubmission = getValue(fields.isResubmission) === 'true';
        
        // Security check: Prevent resubmission if already submitted (unless it's a resubmission request)
        if (!isResubmission) {
          const existingUser = await prisma.users.findUnique({
            where: { empid: body.empid },
            select: { form_submitted: true }
          });

          if (existingUser?.form_submitted) {
            return res.status(400).json({ 
              error: 'Documents already submitted. No further changes allowed.' 
            });
          }
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
        const userUpdateData = { 
          name: body.name,
          contact_number: body.contact_no,
          ...(profilePath && { profile_photo: profilePath })
        };
        
        // Only set form_submitted to true if it's not already submitted or if it's a resubmission
        if (!isResubmission) {
          userUpdateData.form_submitted = true;
        }
        
        await prisma.users.updateMany({
          where: { email: body.email },
          data: userUpdateData
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

        // Mark resubmission requests as completed for uploaded documents
        const documentsToCheck = [
          { type: 'aadhar_card', uploaded: !!aadharPath, name: 'Aadhar Card' },
          { type: 'pan_card', uploaded: !!panPath, name: 'PAN Card' },
          { type: 'education_certificates', uploaded: !!educationPath, name: 'Education Certificates' },
          { type: 'resume', uploaded: !!resumePath, name: 'Resume' },
          { type: 'experience_certificate', uploaded: !!experiencePath, name: 'Experience Certificate' },
          { type: 'profile_photo', uploaded: !!profilePath, name: 'Profile Photo' },
          { type: 'checkbook_document', uploaded: !!bankPath, name: 'Bank Details Document' }
        ];

        const completedDocuments = [];
        for (const doc of documentsToCheck) {
          if (doc.uploaded) {
            const updatedRequests = await prisma.document_resubmission_requests.updateMany({
              where: {
                employee_empid: body.empid,
                document_type: doc.type,
                status: 'pending'
              },
              data: {
                status: 'completed',
                completed_at: new Date()
              }
            });
            
            // If any requests were updated, add to completed list
            if (updatedRequests.count > 0) {
              completedDocuments.push(doc.name);
            }
          }
        }

        // Send notifications to HR/Admin for completed resubmissions
        if (completedDocuments.length > 0) {
          const hrAdminUsers = await prisma.users.findMany({
            where: {
              role: { in: ['hr', 'admin', 'superadmin'] }
            },
            select: { empid: true }
          });

          const notificationMessage = `${body.name} (${body.empid}) has resubmitted: ${completedDocuments.join(', ')}`;
          
          // Create database notification
          await prisma.notifications.create({
            data: {
              recipient_type: 'role',
              recipient_id: 'hr,admin,superadmin',
              title: 'Documents Resubmitted',
              message: notificationMessage,
              type: 'document_resubmission_completed',
              metadata: JSON.stringify({
                empid: body.empid,
                employeeName: body.name,
                completedDocuments: completedDocuments
              }),
              created_at: new Date(),
              is_read: false
            }
          });

          // Send real-time notifications
          for (const hrUser of hrAdminUsers) {
            await sendNotificationToUser(hrUser.empid, {
              type: 'document_resubmission_completed',
              title: 'Documents Resubmitted',
              message: notificationMessage,
              empid: body.empid,
              employeeName: body.name,
              completedDocuments: completedDocuments
            });
          }
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