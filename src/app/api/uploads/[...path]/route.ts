// src/app/api/uploads/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: filePath } = await context.params;

  const fullPath = path.join(process.cwd(), "public", "uploads", ...filePath);

  if (!fs.existsSync(fullPath)) {
    const defaultImagePath = path.join(
      process.cwd(),
      "public",
      "images",
      "profile.png"
    );
    if (fs.existsSync(defaultImagePath)) {
      const buffer = fs.readFileSync(defaultImagePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const stat = fs.statSync(fullPath);
  if (!stat.isFile()) {
    return NextResponse.json({ error: "Not a file" }, { status: 404 });
  }

  const ext = path.extname(fullPath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
  };

  const contentType = mimeTypes[ext] || "application/octet-stream";

  const fileBuffer = fs.readFileSync(fullPath);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000",
      "Content-Length": stat.size.toString(),
    },
  });
}
