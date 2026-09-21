import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { sendNotificationToUser } from '@/lib/notificationEmitter';
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest) {
  try {
    const empid = req.nextUrl.searchParams.get('empid');

    if (!empid) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
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

    return NextResponse.json({
      success: true,
      requests
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching resubmission requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.COMPLIANCE_REQUEST_RESUBMISSION);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized: insufficient permissions' }, { status: 403 });
    }

    const requestorEmpid = decoded.empid;
    const requestorRole = decoded.role;

    const body = await req.json().catch(() => ({}));
    const { empid, documentType, reason } = body;

    if (!empid || !documentType || !reason?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const targetEmployee = await prisma.users.findUnique({
      where: { empid: empid },
      select: { empid: true, name: true, email: true }
    });

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const requestor = await prisma.users.findUnique({
      where: { empid: requestorEmpid },
      select: { name: true }
    });

    await prisma.document_resubmission_requests.create({
      data: {
        employee_empid: empid,
        document_type: documentType,
        requested_by: requestorEmpid,
        reason: reason.trim(),
        status: 'pending'
      }
    });

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

    await sendNotificationToUser(empid, {
      type: 'document_resubmission_request',
      title: 'Document Resubmission Required',
      message: `Please resubmit your ${getDocumentDisplayName(documentType)}. Reason: ${reason}`,
      documentType: documentType,
      requestedBy: requestorEmpid,
      requestorName: requestor?.name || requestorRole,
      reason
    });

    return NextResponse.json({
      message: `Resubmission request sent to ${targetEmployee.name}`,
      employeeName: targetEmployee.name
    }, { status: 200 });

  } catch (error) {
    console.error('Error requesting document resubmission:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function getDocumentDisplayName(documentType: string) {
  const names: Record<string, string> = {
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
