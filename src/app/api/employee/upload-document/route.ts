import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userEmpid = decoded.empid;
    const userRole = decoded.role;

    if (userRole !== 'employee') {
      return NextResponse.json({ error: 'Only employees can upload documents' }, { status: 403 });
    }

    const formData = await req.formData();
    const documentType = formData.get('documentType') as string;
    const file = formData.get('document') as File | null;

    if (!documentType || !file || typeof file === 'string' || !file.name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.name}`;
    const finalPath = path.join(uploadsDir, fileName);
    const bytes = await file.arrayBuffer();
    await fs.promises.writeFile(finalPath, Buffer.from(bytes));
    const filePath = `/uploads/${fileName}`;

    const updateData: Record<string, any> = {};
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

    const user = await prisma.users.findUnique({
      where: { empid: userEmpid },
      select: { name: true }
    });

    // Find roles with compliance/verification permissions dynamically
    const compliancePerms = await prisma.role_permissions.findMany({
      where: {
        permission: {
          key: { in: ['compliance.view', 'compliance.view_documents', 'compliance.request_resubmission', 'employee.verify'] }
        }
      },
      include: { role: true }
    });
    const eligibleRoles = [...new Set(compliancePerms.map(rp => rp.role.name.toLowerCase()))];
    const allRoles = await prisma.role.findMany({ select: { name: true } });
    for (const r of allRoles) {
      const lower = r.name.toLowerCase();
      if ((lower.includes('admin') || lower.includes('hr')) && !eligibleRoles.includes(lower)) {
        eligibleRoles.push(lower);
      }
    }

    try {
      await (prisma as any).notifications?.create({
        data: {
          recipient_type: 'role',
          recipient_id: eligibleRoles.join(',') || 'admin,superadmin',
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
    } catch (e) {
      console.warn('Could not record notification in DB:', e);
    }

    return NextResponse.json({
      message: 'Document uploaded successfully',
      filePath: filePath
    }, { status: 200 });

  } catch (error) {
    console.error('Error in document upload:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function getTableAndField(documentType: string) {
  const mapping: Record<string, { table: string; field: string }> = {
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
