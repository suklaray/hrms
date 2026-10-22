import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { sendShortlistMail } from "@/lib/recruitmentMail";

export async function POST(req: NextRequest) {
  const { error } = await checkAuth(req, [PERMISSION_KEYS.JOB_APPLICATION_SHORTLIST]);
  if (error) return error;

  try {
    const { resumeId } = await req.json();

    if (!resumeId) {
      return NextResponse.json(
        { success: false, error: "resumeId is required" },
        { status: 400 }
      );
    }

    const parsedResumeId = Number(resumeId);

    if (Number.isNaN(parsedResumeId)) {
      return NextResponse.json(
        { success: false, error: "Invalid resumeId" },
        { status: 400 }
      );
    }

    // Get parsed resume
    const resume = await prisma.parsed_resumes.findUnique({
      where: {
        id: parsedResumeId,
      },
    });

    if (!resume) {
      return NextResponse.json(
        { success: false, error: "Parsed resume not found" },
        { status: 404 }
      );
    }

    // Do not shortlist rejected applications
    if (resume.application_status === "Rejected") {
      return NextResponse.json(
        { success: false, error: "A rejected application cannot be shortlisted" },
        { status: 400 }
      );
    }

    const updatedResume = await prisma.parsed_resumes.update({
      where: { id: parsedResumeId },
      data: { application_status: "Shortlisted" },
    });

    let mailSent = false;
    try { await sendShortlistMail(resume.email || "", resume.full_name || "Applicant"); mailSent = true; } catch {}

    return NextResponse.json({
      success: true,
      message: "Candidate shortlisted successfully",
      mailSent,
      resume: updatedResume,
    });
  } catch (error) {
    console.error("SHORTLIST API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to shortlist candidate",
      },
      { status: 500 }
    );
  }
}
