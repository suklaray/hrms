import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { checkAuth } from "@/lib/apiAuth";
import { isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ empid: string }> }
) {
  const auth = await checkAuth(req, [
    PERMISSION_KEYS.COMPLIANCE_VIEW_DOCUMENTS,
    PERMISSION_KEYS.EMPLOYEE_VIEW,
    PERMISSION_KEYS.EMPLOYEE_EDIT,
  ]);
  if (auth.error) return auth.error;

  const canViewDocuments =
    isSuperAdmin(auth.user) ||
    auth.permissions?.has(PERMISSION_KEYS.COMPLIANCE_VIEW_DOCUMENTS) ||
    (auth.permissions?.has(PERMISSION_KEYS.EMPLOYEE_VIEW) &&
      auth.permissions?.has(PERMISSION_KEYS.EMPLOYEE_EDIT));
  if (!canViewDocuments) {
    return NextResponse.json(
      { error: 'Forbidden: insufficient permissions' },
      { status: 403 }
    );
  }

  const { empid } = await params;
  const type = req.nextUrl.searchParams.get('type');

  if (!empid || !type) {
    return NextResponse.json({ error: 'Employee ID and document type are required' }, { status: 400 });
  }

  try {
    // Get user email from users table
    const user = await prisma.users.findUnique({
      where: { empid: empid },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get document from employees table using email
    const employee: any = await prisma.employees.findFirst({
      where: { email: user.email },
      select: {
        resume: true,
        aadhar_card: true,
        pan_card: true,
        education_certificates: true,
        experience_certificate: true,
        profile_photo: true,
        bank_details: {
          select: { checkbook_document: true },
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
    });
    console.log("Employee:",employee);
    let docPath: string | null = null;

    if (type === 'bank_details' || type==="checkbook_document") {
      docPath = employee?.bank_details?.[0]?.checkbook_document || null;
    } else {
      docPath = employee?.[type] || null;
    }

    if (!employee || !docPath) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const documentPath = docPath.startsWith('/') ? docPath.substring(1) : docPath;
    const filePath = path.join(process.cwd(), 'public', documentPath);
    console.log("process.cwd():", process.cwd());
console.log("docPath:", docPath);
console.log("documentPath:", documentPath);
console.log("filePath:", filePath);
console.log("File exists:", fs.existsSync(filePath));
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    let contentType = 'application/pdf';
    if (fileExt === '.jpg' || fileExt === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (fileExt === '.png') {
      contentType = 'image/png';
    } else if (fileExt === '.doc') {
      contentType = 'application/msword';
    } else if (fileExt === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${type}${fileExt}"`,
      },
    });
    
  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
