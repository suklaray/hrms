import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { sendInterviewScheduleMail } from "@/lib/recruitmentMail";
import { canManageInterviewSchedules } from "@/lib/interviewScheduleAccess";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

// PATCH /api/recruitment/job-application/schedule/approve
// Body: { resumeId: number, action: "APPROVED" | "REJECTED" }
export async function PATCH(req: NextRequest) {
  const { error, user, permissions } = await checkAuth(req);
  if (error) return error;

  try {
    const { resumeId, action } = await req.json();

    const parsedResumeId = Number(resumeId);
    if (!Number.isInteger(parsedResumeId) || parsedResumeId <= 0 || !["APPROVED", "REJECTED"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "resumeId and action (APPROVED|REJECTED) are required" },
        { status: 400 }
      );
    }

    const resume = await prisma.parsed_resumes.findUnique({
      where: { id: parsedResumeId },
      include: {
        job_description: { select: { hiring_manager_id: true } },
        candidate: true,
      },
    });

    if (!resume) {
      return NextResponse.json({ success: false, error: "Resume not found" }, { status: 404 });
    }

    if (resume.interview_schedule_status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "No pending interview schedule for this candidate" },
        { status: 400 }
      );
    }

    // Verify the logged-in user is the assigned hiring manager
    const hiringManagerId = resume.job_description?.hiring_manager_id;
    const isAdmin = await canManageInterviewSchedules(user);
    const canReview = permissions?.has(PERMISSION_KEYS.JOB_APPLICATION_VIEW) || isAdmin;
    if (!canReview) {
      return NextResponse.json(
        { success: false, error: "Permission denied: interview schedule review is not allowed" },
        { status: 403 }
      );
    }
    if (!isAdmin && (!hiringManagerId || !user?.empid || hiringManagerId !== user.empid)) {
      return NextResponse.json(
        { success: false, error: "Only the assigned hiring manager, admin, or superadmin can review this schedule" },
        { status: 403 }
      );
    }

    if (action === "APPROVED") {
      if (!resume.pending_interview_date || !resume.pending_interview_time_from || !resume.pending_interview_time_to) {
        return NextResponse.json(
          { success: false, error: "Pending interview data is incomplete" },
          { status: 400 }
        );
      }

      if (!resume.candidate) {
        return NextResponse.json(
          { success: false, error: "Candidate record not found" },
          { status: 404 }
        );
      }

      const candidateId = resume.candidate.id;
      const pendingDate = resume.pending_interview_date;
      const pendingTimeFrom = resume.pending_interview_time_from;
      const pendingTimeTo = resume.pending_interview_time_to;
      const updated = await prisma.$transaction(async (transaction) => {
        const result = await transaction.parsed_resumes.updateMany({
          where: { id: parsedResumeId, interview_schedule_status: "PENDING" },
          data: {
            interview_schedule_status: "APPROVED",
            pending_interview_date: null,
            pending_interview_time_from: null,
            pending_interview_time_to: null,
          },
        });
        if (result.count !== 1) return false;

        await transaction.candidates.update({
          where: { id: candidateId },
          data: {
            interview_date: pendingDate,
            interview_time_from: pendingTimeFrom,
            interview_time_to: pendingTimeTo,
            status: "Pending",
          },
        });
        return true;
      });
      if (!updated) {
        return NextResponse.json(
          { success: false, error: "This interview schedule has already been reviewed" },
          { status: 409 }
        );
      }

      try {
        await sendInterviewScheduleMail(
          resume.candidate.email,
          resume.candidate.name,
          pendingDate.toISOString(),
          pendingTimeFrom,
          pendingTimeTo
        );
        return NextResponse.json({
          success: true,
          message: "Interview scheduled and email sent successfully",
          emailSent: true,
        });
      } catch (mailErr) {
        console.error("Failed to send interview schedule mail:", mailErr);
        return NextResponse.json({
          success: true,
          message: "Interview scheduled successfully, but email could not be sent",
          emailSent: false,
        });
      }
    } else {
      const result = await prisma.parsed_resumes.updateMany({
        where: { id: parsedResumeId, interview_schedule_status: "PENDING" },
        data: {
          interview_schedule_status: "REJECTED",
          pending_interview_date: null,
          pending_interview_time_from: null,
          pending_interview_time_to: null,
        },
      });
      if (result.count !== 1) {
        return NextResponse.json(
          { success: false, error: "This interview schedule has already been reviewed" },
          { status: 409 }
        );
      }

      return NextResponse.json({ success: true, message: "Interview rejected" });
    }
  } catch (error) {
    console.error("APPROVE SCHEDULE ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to process approval" },
      { status: 500 }
    );
  }
}