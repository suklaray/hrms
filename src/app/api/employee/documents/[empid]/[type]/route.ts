import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyHRToken } from "@/lib/auth-hr";
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ empid: string; type: string }> }
) {
  const user = await verifyHRToken(req);
  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { empid, type } = await params;

  try {
    // Get employee data
    let employee = await prisma.employees.findFirst({
      where: { 
        OR: [
          { main_employee_id: empid },
          ...(isNaN(Number(empid)) ? [] : [{ empid: parseInt(empid, 10) }]),
        ],
      },
      include: {
        bank_details: true,
      }
    });

    // Fallback: if not found by main_employee_id/empid, check if empid matches a user in users table and match by email
    if (!employee) {
      const userRecord = await prisma.users.findUnique({
        where: { empid },
        select: { email: true },
      });
      if (userRecord?.email) {
        employee = await prisma.employees.findFirst({
          where: { email: userRecord.email },
          include: {
            bank_details: true,
          },
        });
      }
    }

    if (!employee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    let filePath = '';

    // Map document type to file path
    switch (type) {
      case 'aadhar':
        filePath = employee.aadhar_card || '';
        break;
      case 'pan':
        filePath = employee.pan_card || '';
        break;
      case 'resume':
        filePath = employee.resume || '';
        break;
      case 'experience':
        filePath = employee.experience_certificate || '';
        break;
      case 'checkbook':
        filePath = employee.bank_details?.[0]?.checkbook_document || '';
        break;
      default:
        return NextResponse.json({ message: 'Invalid document type' }, { status: 400 });
    }

    if (!filePath) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }

    // Construct full file path (strip any leading slash to avoid root-relative path resolution on Windows)
    const cleanFilePath = filePath.replace(/^[/\\]+/, '');
    const fullPath = path.join(process.cwd(), 'public', cleanFilePath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ message: 'File not found on server' }, { status: 404 });
    }

    // Get file stats
    const stats = fs.statSync(fullPath);
    const fileExtension = path.extname(fullPath).toLowerCase();

    // Set appropriate content type
    let contentType = 'application/octet-stream';
    switch (fileExtension) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    }

    const fileBuffer = fs.readFileSync(fullPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString(),
        'Content-Disposition': `inline; filename="${path.basename(fullPath)}"`,
      },
    });

  } catch (error) {
    console.error('Document viewing error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
