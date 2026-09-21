import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ empid: string }> }
) {
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
      },
    });

    if (!employee || !employee[type]) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const docPath = employee[type];
    const documentPath = docPath.startsWith('/') ? docPath.substring(1) : docPath;
    const filePath = path.join(process.cwd(), 'public', documentPath);
    
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
