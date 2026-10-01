//C:\OfficeWork\hrms\pages\api\recruitment\job-description\[id]\matches.js
//src/app/api/recruitment/job-description/[id]/candidates/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface CandidateActionBody {
  candidateId?: string;
  action?: "SHORTLISTED" | "REJECTED" | "INTERVIEW";
  interviewDate?: string;
  interviewTimeFrom?: string;
  interviewTimeTo?: string;
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const jobId = Number(id);

    if (!Number.isInteger(jobId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid job description ID",
        },
        { status: 400 }
      );
    }

    const body = (await request.json()) as CandidateActionBody;

    const {
      candidateId,
      action,
      interviewDate,
      interviewTimeFrom,
      interviewTimeTo,
    } = body;

    if (
      !candidateId ||
      !action ||
      !["SHORTLISTED", "REJECTED", "INTERVIEW"].includes(action)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Candidate action is required",
        },
        { status: 400 }
      );
    }

    const data: {
      status: "Selected" | "Rejected";
      interview_date?: Date;
      interview_time_from?: string | null;
      interview_time_to?: string | null;
    } = {
      status:
        action === "SHORTLISTED" || action === "INTERVIEW"
          ? "Selected"
          : "Rejected",
    };

    if (action === "INTERVIEW") {
      if (!interviewDate) {
        return NextResponse.json(
          {
            success: false,
            error: "Interview date is required",
          },
          { status: 400 }
        );
      }

      data.interview_date = new Date(interviewDate);
      data.interview_time_from = interviewTimeFrom || null;
      data.interview_time_to = interviewTimeTo || null;
    }

    const candidate = await prisma.candidates.update({
      where: {
        candidate_id: candidateId,
      },
      data,
    });

    return NextResponse.json(
      {
        success: true,
        candidate,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Candidate matching error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update candidate",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const jobId = Number(id);

    if (!Number.isInteger(jobId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid job description ID",
        },
        { status: 400 }
      );
    }

    const job = await prisma.job_descriptions.findUnique({
      where: {
        id: jobId,
      },
      select: {
        id: true,
        title: true,
        department: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: "Job description not found",
        },
        { status: 404 }
      );
    }

    const profiles = await prisma.parsed_resumes.findMany({
      where: {
        parsing_status: "DONE",
        job_description_id: jobId,
      },
      orderBy: {
        matching_score: "desc",
      },
    });

    const results = profiles.map((profile) => ({
      profileId: profile.id,
      candidate: {
        name: profile.full_name || "Unnamed applicant",
        email: profile.email || "No email",
        status: profile.application_status || "Waiting",
      },
      score: profile.matching_score ?? 0,
    }));

    return NextResponse.json(
      {
        success: true,
        job,
        results,
        totalEligible: profiles.length,
        totalMatched: results.length,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Candidate matching error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load candidate matches",
      },
      { status: 500 }
    );
  }
}
