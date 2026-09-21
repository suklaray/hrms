import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

const uploadDir = path.join(process.cwd(), 'hr-assistant-data');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value || req.cookies.get('employeeToken')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user: any = jwt.verify(token, process.env.JWT_SECRET!);
    const hasAccess = await checkPermission(user, PERMISSION_KEYS.SETTINGS_BOT);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied: insufficient permissions' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const description = (formData.get('description') as string) || '';

    if (!file || typeof file === 'string' || !file.name) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const metadata = {
      name: file.name,
      description,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.empid || user.id,
    };

    const metadataPath = path.join(uploadDir, `${file.name}.meta.json`);
    await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    const finalPath = path.join(uploadDir, file.name);
    const bytes = await file.arrayBuffer();
    await fs.promises.writeFile(finalPath, Buffer.from(bytes));

    return NextResponse.json({
      message: 'File uploaded successfully',
      filename: file.name
    }, { status: 200 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
