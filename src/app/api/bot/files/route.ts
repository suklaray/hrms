import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { checkBotPermission } from "@/lib/botAuth";

const uploadDir = path.join(process.cwd(), 'hr-assistant-data');

export async function GET(req: NextRequest) {
  const auth = await checkBotPermission(req, PERMISSION_KEYS.SETTINGS_BOT);
  if (auth.error) return auth.error;

  try {
    if (!fs.existsSync(uploadDir)) {
      return NextResponse.json({ files: [] }, { status: 200 });
    }

    const files = fs.readdirSync(uploadDir)
      .filter(file => !file.endsWith('.meta.json'))
      .map(filename => {
        const metadataPath = path.join(uploadDir, `${filename}.meta.json`);
        let metadata = { name: filename, size: 0, uploadedAt: new Date().toISOString() };

        if (fs.existsSync(metadataPath)) {
          try {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          } catch (error) {
            console.error('Error reading metadata:', error);
          }
        } else {
          const filePath = path.join(uploadDir, filename);
          const stats = fs.statSync(filePath);
          metadata.size = stats.size;
          metadata.uploadedAt = stats.mtime.toISOString();
        }

        return metadata;
      })
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return NextResponse.json({ files }, { status: 200 });
  } catch (error) {
    console.error('Files API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await checkBotPermission(req, PERMISSION_KEYS.SETTINGS_BOT_DELETE);
  if (auth.error) return auth.error;

  try {
    const body = await req.json().catch(() => ({}));
    const { filename } = body;

    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }

    const filePath = path.join(uploadDir, filename);
    const metadataPath = path.join(uploadDir, `${filename}.meta.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }

    return NextResponse.json({ message: 'File deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Files API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
