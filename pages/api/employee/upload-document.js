import { formidable } from 'formidable';
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

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
    keepExtensions: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parsing error:', err);
      return res.status(400).json({ error: 'File upload failed' });
    }

    try {
      // Get user from JWT token
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userEmpid = decoded.empid;
      const userRole = decoded.role;

      const getValue = (field) => Array.isArray(field) ? field[0] : field;
      
      const documentType = getValue(fields.documentType);
      const file = files.document?.[0] || files.document;

      if (!documentType || !file) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Only employees can upload their own documents
      if (userRole !== 'employee') {
        return res.status(403).json({ error: 'Only employees can upload documents' });
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Process the uploaded file
      const fileName = `${Date.now()}-${file.originalFilename}`;
      const finalPath = path.join(uploadsDir, fileName);
      fs.copyFileSync(file.filepath, finalPath);
      fs.unlinkSync(file.filepath);
      const filePath = `/uploads/${fileName}`;

      // Update the specific document based on type
      const updateData = {};
      const tableToUpdate = getTableAndField(documentType);
      
      if (tableToUpdate.table === 'employees') {
        updateData[tableToUpdate.field] = filePath;
        
        await prisma.employees.updateMany({
          where: { main_employee_id: userEmpid },
          data: updateData
        });
      } else if (tableToUpdate.table === 'bank_details') {
        await prisma.bank_details.updateMany({
          where: { employee_id: userEmpid },
          data: { [tableToUpdate.field]: filePath }
        });
      } else if (tableToUpdate.table === 'users') {
        await prisma.users.updateMany({
          where: { empid: userEmpid },
          data: { [tableToUpdate.field]: filePath }
        });
      }

      // Mark any pending resubmission requests as completed
      await prisma.document_resubmission_requests.updateMany({
        where: {
          employee_empid: userEmpid,
          document_type: documentType,
          status: 'pending'
        },
        data: {
          status: 'completed',
          completed_at: new Date()
        }
      });

      // Get user info for notification
      const user = await prisma.users.findUnique({
        where: { empid: userEmpid },
        select: { name: true }
      });

      // Create notification for HR/Admin about completion
      await prisma.notifications.create({
        data: {
          recipient_type: 'role',
          recipient_id: 'hr,admin,superadmin',
          title: 'Document Resubmitted',
          message: `${user?.name} (${userEmpid}) has resubmitted their ${getDocumentDisplayName(documentType)}`,
          type: 'document_resubmission_completed',
          metadata: JSON.stringify({
            empid: userEmpid,
            employeeName: user?.name,
            documentType: documentType,
            documentPath: filePath
          }),
          created_at: new Date(),
          is_read: false
        }
      });

      res.status(200).json({
        message: 'Document uploaded successfully',
        filePath: filePath
      });

    } catch (error) {
      console.error('Error in document upload:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });
}

function getTableAndField(documentType) {
  const mapping = {
    'aadhar_card': { table: 'employees', field: 'aadhar_card' },
    'pan_card': { table: 'employees', field: 'pan_card' },
    'resume': { table: 'employees', field: 'resume' },
    'experience_certificate': { table: 'employees', field: 'experience_certificate' },
    'education_certificates': { table: 'employees', field: 'education_certificates' },
    'profile_photo': { table: 'employees', field: 'profile_photo' },
    'checkbook_document': { table: 'bank_details', field: 'checkbook_document' }
  };
  
  return mapping[documentType] || { table: 'employees', field: documentType };
}

function getDocumentDisplayName(documentType) {
  const names = {
    'aadhar_card': 'Aadhar Card',
    'pan_card': 'PAN Card',
    'resume': 'Resume',
    'experience_certificate': 'Experience Certificate',
    'education_certificates': 'Education Certificates',
    'profile_photo': 'Profile Photo',
    'checkbook_document': 'Checkbook Document'
  };
  
  return names[documentType] || documentType;
}