import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const uploadDir = path.join(process.cwd(), 'hr-assistant-data');

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value || req.cookies.get('employeeToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    jwt.verify(token, process.env.JWT_SECRET!);

    const filename = req.nextUrl.searchParams.get('filename');
    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }

    const filePath = path.join(uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stats.size.toString(),
      },
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
