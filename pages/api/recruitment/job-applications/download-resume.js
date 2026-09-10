import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { resumeId } = req.query;

    if (!resumeId) {
      return res.status(400).json({
        success: false,
        error: "resumeId is required",
      });
    }

    const resume = await prisma.parsed_resumes.findUnique({
      where: {
        id: Number(resumeId),
      },
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: "Resume not found",
      });
    }

    if (!resume.resume_file_path) {
      return res.status(404).json({
        success: false,
        error: "Resume file path not found",
      });
    }

    const filePath = path.join(
      process.cwd(),
      resume.resume_file_path
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Resume file does not exist",
      });
    }

    const fileName =
      resume.original_file_name || path.basename(filePath);

    const extension = path.extname(fileName).toLowerCase();

    const contentTypes = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt": "text/plain",
    };

    res.setHeader(
      "Content-Type",
      contentTypes[extension] || "application/octet-stream"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    const file = fs.readFileSync(filePath);

    return res.status(200).send(file);

  } catch (error) {
    console.error("DOWNLOAD RESUME ERROR:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to download resume",
    });
  }
}