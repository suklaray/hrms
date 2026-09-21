import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { DecodedToken } from "@/lib/jwtTypes";

import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

const uploadDir = path.join(process.cwd(), 'hr-assistant-data');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  try {
    const token = req.cookies.get('token')?.value || req.cookies.get('employeeToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
    const hasAccess = await checkPermission(user, PERMISSION_KEYS.SETTINGS_BOT);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied: insufficient permissions' }, { status: 403 });
    }

    const { filename, content } = body;

    if (!filename || !content) {
      return NextResponse.json({ error: 'Filename and content are required' }, { status: 400 });
    }

    // Create the file
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, content, 'utf8');

    // Create metadata file
    const metadata = {
      name: filename,
      description: '',
      size: Buffer.byteLength(content, 'utf8'),
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.empid || user.id,
    };

    const metadataPath = path.join(uploadDir, `${filename}.meta.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      message: 'Content saved successfully',
      filename
    }, { status: 200 });

  } catch (error) {
    console.error('Text save error:', error);
    return NextResponse.json({ error: 'Save failed' }, { status: 500 });
  }
}


