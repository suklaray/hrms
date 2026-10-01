import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resumeId = searchParams.get("resumeId");

    if (!resumeId) {
      return NextResponse.json(
        { success: false, error: "resumeId is required" },
        { status: 400 }
      );
    }

    const resume = await prisma.parsed_resumes.findUnique({
      where: {
        id: Number(resumeId),
      },
    });

    if (!resume) {
      return NextResponse.json(
        { success: false, error: "Resume not found" },
        { status: 404 }
      );
    }

    if (!resume.resume_file_path) {
      return NextResponse.json(
        { success: false, error: "Resume file path not found" },
        { status: 404 }
      );
    }

    const filePath = path.join(process.cwd(), resume.resume_file_path);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: "Resume file does not exist" },
        { status: 404 }
      );
    }

    const fileName = resume.original_file_name || path.basename(filePath);

    const extension = path.extname(fileName).toLowerCase();

    const contentTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt": "text/plain",
    };

    const file = fs.readFileSync(filePath);

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type":
          contentTypes[extension] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("DOWNLOAD RESUME ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Failed to download resume" },
      { status: 500 }
    );
  }
}