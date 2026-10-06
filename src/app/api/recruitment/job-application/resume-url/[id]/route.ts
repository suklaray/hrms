import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest) {
  const { error } = await checkAuth(req, [PERMISSION_KEYS.RESUME_DOWNLOAD]);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || isNaN(Number(id))) {
    return NextResponse.json(
      { success: false, error: "Invalid record ID." },
      { status: 400 }
    );
  }

  let record;

  try {
    record = await prisma.parsed_resumes.findUnique({
      where: { id: Number(id) },
      select: {
        resume_file_path: true,
        original_file_name: true,
        resume_mime_type: true,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: "DB error: " + message },
      { status: 500 }
    );
  }

  if (!record || !record.resume_file_path) {
    return NextResponse.json(
      { success: false, error: "Resume not found." },
      { status: 404 }
    );
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    record.resume_file_path.replace(/^\//, "")
  );

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { success: false, error: "File not found on server." },
      { status: 404 }
    );
  }

  // Return the actual public URL instead of the PDF itself
  const resumeUrl = record.resume_file_path.startsWith("/")
    ? record.resume_file_path
    : `/${record.resume_file_path}`;

  return NextResponse.json({
    success: true,
    url: resumeUrl,
    filename: record.original_file_name || "resume",
    mimeType: record.resume_mime_type || "application/octet-stream",
  });
}