import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { sendNotificationToUser } from '@/lib/notificationEmitter';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return handleCreateRequest(req, res);
  } else if (req.method === 'GET') {
    return handleGetRequests(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGetRequests(req, res) {
  try {
    const { empid } = req.query;
    
    if (!empid) {
      return res.status(400).json({ error: 'Employee ID is required' });
    }

    const requests = await prisma.document_resubmission_requests.findMany({
      where: {
        employee_empid: empid,
        status: 'pending'
      },
      select: {
        id: true,
        document_type: true,
        reason: true,
        created_at: true,
        requestor: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Error fetching document resubmission requests:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleCreateRequest(req, res) {
  try {
    // Get user from JWT token
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const requestorRole = decoded.role;
    const requestorEmpid = decoded.empid;

    // Only admin, HR, superadmin can request resubmission
    if (!['admin', 'hr', 'superadmin'].includes(requestorRole)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { empid, documentType, reason } = req.body;

    if (!empid || !documentType || !reason?.trim()) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify target employee exists
    const targetEmployee = await prisma.users.findUnique({
      where: { empid: empid },
      select: { empid: true, name: true, email: true }
    });

    if (!targetEmployee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get requestor name
    const requestor = await prisma.users.findUnique({
      where: { empid: requestorEmpid },
      select: { name: true }
    });

    // Create resubmission request in database
    await prisma.document_resubmission_requests.create({
      data: {
        employee_empid: empid,
        document_type: documentType,
        requested_by: requestorEmpid,
        reason: reason.trim(),
        status: 'pending'
      }
    });

    // Create notification for the employee
    await prisma.$executeRaw`
  INSERT INTO notifications 
  (recipient_type, recipient_id, title, message, type, metadata, is_read, created_at) 
  VALUES ('user', ${empid}, 'Document Resubmission Required', ${`Please resubmit your ${getDocumentDisplayName(documentType)}. Reason: ${reason}`}, 'document_resubmission_request', ${JSON.stringify({
      empid: empid,
      documentType: documentType,
      requestedBy: requestorEmpid,
      requestorName: requestor?.name || requestorRole,
      reason
    })}, false, NOW())
`;

    // Send real-time notification to employee
    await sendNotificationToUser(empid, {
      type: 'document_resubmission_request',
      title: 'Document Resubmission Required',
      message: `Please resubmit your ${getDocumentDisplayName(documentType)}. Reason: ${reason}`,
      documentType: documentType,
      requestedBy: requestorEmpid,
      requestorName: requestor?.name || requestorRole,
      reason
    });

    res.status(200).json({
      message: `Resubmission request sent to ${targetEmployee.name}`,
      employeeName: targetEmployee.name
    });

  } catch (error) {
    console.error('Error requesting document resubmission:', error);
    res.status(500).json({ error: 'Server error' });
  }
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