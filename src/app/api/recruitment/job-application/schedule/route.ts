import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { sendInterviewScheduleMail } from "@/lib/recruitmentMail";  
import { isSuperAdmin } from "@/lib/rbac";                           

export async function PATCH(req: NextRequest) {
  const { error, user } = await checkAuth(req, [PERMISSION_KEYS.JOB_APPLICATION_SCHEDULE]); 
  if (error) return error;

  try {
    const { resumeId, interviewDate, interviewTimeFrom, interviewTimeTo } = await req.json();

    if (!resumeId || !interviewDate || !interviewTimeFrom || !interviewTimeTo) {
      return NextResponse.json(
        { success: false, error: "resumeId, interviewDate, interviewTimeFrom and interviewTimeTo are required" },
        { status: 400 }
      );
    }

    const parsedResumeId = Number(resumeId);
    if (Number.isNaN(parsedResumeId)) {
      return NextResponse.json({ success: false, error: "Invalid resumeId" }, { status: 400 });
    }

    const resume = await prisma.parsed_resumes.findUnique({
      where: { id: parsedResumeId },
      include: {
        job_description: { select: { hiring_manager_id: true } },
        candidate: true,
      },
    });

    if (!resume) {
      return NextResponse.json({ success: false, error: "Parsed resume not found" }, { status: 404 });
    }

    if (resume.application_status !== "Shortlisted") {
      return NextResponse.json(
        { success: false, error: "Only shortlisted candidates can be scheduled" },
        { status: 400 }
      );
    }

    if (resume.interview_schedule_status === "PENDING") {
      return NextResponse.json(
        { success: false, error: "An interview schedule is already awaiting hiring manager approval" },
        { status: 409 }
      );
    }

    const interviewDateTime = new Date(`${interviewDate}T00:00:00`);
    if (Number.isNaN(interviewDateTime.getTime())) {
      return NextResponse.json({ success: false, error: "Invalid interview date" }, { status: 400 });
    }

    if (!resume.job_description?.hiring_manager_id) {
      return NextResponse.json(
        { success: false, error: "This job does not have an assigned hiring manager" },
        { status: 400 }
      );
    }

    const isHiringManager =
      resume.job_description.hiring_manager_id &&
      user?.empid &&
      resume.job_description.hiring_manager_id === user.empid;

    const isAdmin = await isSuperAdmin(user);
    const shouldAutoApprove = Boolean(isHiringManager || isAdmin);

    if (shouldAutoApprove) {
      if (!resume.candidate) {
        return NextResponse.json(
          { success: false, error: "Candidate record not found for this resume" },
          { status: 404 }
        );
      }

      const candidateId = resume.candidate.id;

      await prisma.$transaction(async (tx) => {
        await tx.parsed_resumes.update({
          where: { id: parsedResumeId },
          data: {
            interview_schedule_status: "APPROVED",
            pending_interview_date: null,
            pending_interview_time_from: null,
            pending_interview_time_to: null,
          },
        });

        await tx.candidates.update({
          where: { id: candidateId },
          data: {
            interview_date: interviewDateTime,
            interview_time_from: interviewTimeFrom,
            interview_time_to: interviewTimeTo,
            status: "Pending",
          },
        });
      });

      // Send the interview mail
      try {
        await sendInterviewScheduleMail(
          resume.candidate.email,
          resume.candidate.name,
          interviewDateTime.toISOString(),
          interviewTimeFrom,
          interviewTimeTo
        );
        return NextResponse.json({
          success: true,
          autoApproved: true,
          message: "Interview scheduled successfully and email sent",
          emailSent: true,
        });
      } catch (mailErr) {
        console.error("Interview schedule mail failed:", mailErr);
        return NextResponse.json({
          success: true,
          autoApproved: true,
          message: "Interview scheduled, but email could not be sent",
          emailSent: false,
        });
      }
    }

    // 🔻 Existing PENDING path stays here (unchanged)
    await prisma.parsed_resumes.update({
      where: { id: parsedResumeId },
      data: {
        pending_interview_date: interviewDateTime,
        pending_interview_time_from: interviewTimeFrom,
        pending_interview_time_to: interviewTimeTo,
        interview_schedule_status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      autoApproved: false,
      message: "Interview schedule submitted for hiring manager approval",
    });
  } catch (error) {
    console.error("SCHEDULE API ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to schedule interview" },
      { status: 500 }
    );
  }
}