import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function PATCH(req: NextRequest) {
  const { error } = await checkAuth(req, [PERMISSION_KEYS.JOB_APPLICATION_SCHEDULE]);
  if (error) return error;

  try {
    const {
      resumeId,
      interviewDate,
      interviewTimeFrom,
      interviewTimeTo,
    } = await req.json();

    if (
      !resumeId ||
      !interviewDate ||
      !interviewTimeFrom ||
      !interviewTimeTo
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "resumeId, interviewDate, interviewTimeFrom and interviewTimeTo are required",
        },
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

    // Make sure the application exists and is shortlisted
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

    if (resume.application_status !== "Shortlisted") {
      return NextResponse.json(
        { success: false, error: "Only shortlisted candidates can be scheduled" },
        { status: 400 }
      );
    }

    // Find candidate created during shortlist
    const candidate = await prisma.candidates.findUnique({
      where: {
        parsed_resume_id: parsedResumeId,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        {
          success: false,
          error: "Candidate record not found. Please shortlist the candidate first.",
        },
        { status: 404 }
      );
    }

    // Convert date to DateTime
    const interviewDateTime = new Date(`${interviewDate}T00:00:00`);

    if (Number.isNaN(interviewDateTime.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid interview date" },
        { status: 400 }
      );
    }

    const updatedCandidate = await prisma.candidates.update({
      where: {
        id: candidate.id,
      },
      data: {
        interview_date: interviewDateTime,
        interview_time_from: interviewTimeFrom,
        interview_time_to: interviewTimeTo,

        // Keep candidate status as Waiting unless your workflow
        // requires Pending at this point.
        status: "Pending",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Interview scheduled successfully",
      candidate: updatedCandidate,
    });
  } catch (error) {
    console.error("SCHEDULE API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to schedule interview",
      },
      { status: 500 }
    );
  }
}