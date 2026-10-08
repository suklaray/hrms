import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { checkBotPermission } from "@/lib/botAuth";

const uploadDir = path.join(process.cwd(), 'hr-assistant-data');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const auth = await checkBotPermission(req, PERMISSION_KEYS.SETTINGS_BOT_UPLOAD);
  if (auth.error) return auth.error;

  try {
    const body = await req.json();

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
      uploadedBy: auth.user.empid || auth.user.id,
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

