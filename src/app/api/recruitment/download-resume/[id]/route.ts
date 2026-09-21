import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const candidate = await prisma.candidates.findUnique({
      where: { candidate_id: id },
      select: { resume: true },
    });

    if (!candidate || !candidate.resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const resumePath = candidate.resume.startsWith('/') ? candidate.resume.substring(1) : candidate.resume;
    const filePath = path.join(process.cwd(), 'public', resumePath);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    let contentType = 'application/pdf';
    if (fileExt === '.jpg' || fileExt === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (fileExt === '.png') {
      contentType = 'image/png';
    }
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="resume${fileExt}"`,
      },
    });
    
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
