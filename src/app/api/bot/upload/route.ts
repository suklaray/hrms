import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { checkBotPermission } from "@/lib/botAuth";

const uploadDir = path.join(process.cwd(), 'hr-assistant-data');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export async function POST(req: NextRequest) {
  const auth = await checkBotPermission(req, PERMISSION_KEYS.SETTINGS_BOT_UPLOAD);
  if (auth.error) return auth.error;

  try {
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
      uploadedBy: auth.user.empid || auth.user.id,
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
