//src/app/api/recruitment/job-description/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface JobDescriptionBody {
  title?: string;
  department?: string;
  employment_type?: string;
  work_mode?: string;
  location?: string;
  openings?: string | number;
  experience?: string;
  education?: string;
  required_skills?: string[];
  preferred_skills?: string[];
  responsibilities?: string;
  summary?: string;
  salary_min?: string;
  salary_max?: string;
  benefits?: string;
  deadline?: string;
  hiring_manager?: string;
  interview_process?: string;
  keywords?: string;
  status?: string;
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  const { error } = await checkAuth(request, [PERMISSION_KEYS.JD_VIEW, PERMISSION_KEYS.RECRUITMENT_VIEW]);
  if (error) return error;

  const { id } = await params;
  const jdId = parseInt(id, 10);

  if (Number.isNaN(jdId)) {
    return NextResponse.json(
      { message: "Invalid ID" },
      { status: 400 }
    );
  }

  try {
    const job = await prisma.job_descriptions.findUnique({
      where: {
        id: jdId,
      },
    });

    if (!job) {
      return NextResponse.json(
        { message: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...job,
      required_skills: JSON.parse(job.required_skills || "[]"),
      preferred_skills: JSON.parse(job.preferred_skills || "[]"),
    });
  } catch {
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  const { error } = await checkAuth(request, [PERMISSION_KEYS.JD_EDIT, PERMISSION_KEYS.RECRUITMENT_EDIT]);
  if (error) return error;

  const { id } = await params;
  const jdId = parseInt(id, 10);

  if (Number.isNaN(jdId)) {
    return NextResponse.json(
      { message: "Invalid ID" },
      { status: 400 }
    );
  }

  const body = (await request.json()) as JobDescriptionBody;

  const {
    title,
    department,
    employment_type,
    work_mode,
    location,
    openings,
    experience,
    education,
    required_skills,
    preferred_skills,
    responsibilities,
    summary,
    salary_min,
    salary_max,
    benefits,
    deadline,
    hiring_manager,
    interview_process,
    keywords,
    status,
  } = body;

  if (!title?.trim()) {
    return NextResponse.json(
      { message: "Job title is required" },
      { status: 400 }
    );
  }

  if (!department?.trim()) {
    return NextResponse.json(
      { message: "Department is required" },
      { status: 400 }
    );
  }

  if (!required_skills?.length) {
    return NextResponse.json(
      {
        message:
          "At least one required skill must be provided",
      },
      { status: 400 }
    );
  }

  if (!deadline) {
    return NextResponse.json(
      { message: "Deadline is required" },
      { status: 400 }
    );
  }

  if (new Date(deadline) <= new Date()) {
    return NextResponse.json(
      { message: "Deadline must be a future date" },
      { status: 400 }
    );
  }

  try {
    const job = await prisma.job_descriptions.update({
      where: {
        id: jdId,
      },
      data: {
        title: title.trim(),
        department: department.trim(),
        employment_type,
        work_mode,
        location,
        openings: parseInt(String(openings), 10),
        experience,
        education,
        required_skills: JSON.stringify(required_skills),
        preferred_skills: JSON.stringify(
          preferred_skills || []
        ),
        responsibilities,
        summary,
        salary_min: salary_min || null,
        salary_max: salary_max || null,
        benefits: benefits || null,
        deadline: new Date(deadline),
        hiring_manager,
        interview_process: interview_process || null,
        keywords: keywords || null,
        status,
      },
    });

    return NextResponse.json({
      ...job,
      required_skills,
      preferred_skills,
    });
  } catch {
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

// For closing a job description
export async function PATCH(
  request: NextRequest,
  { params }: RouteContext
) {
  const { error } = await checkAuth(request, [PERMISSION_KEYS.JD_CLOSE, PERMISSION_KEYS.RECRUITMENT_EDIT]);
  if (error) return error;

  const { id } = await params;
  const jdId = parseInt(id, 10);

  if (Number.isNaN(jdId)) {
    return NextResponse.json(
      { message: "Invalid ID" },
      { status: 400 }
    );
  }

  try {
    const job = await prisma.job_descriptions.update({
      where: {
        id: jdId,
      },
      data: {
        status: "Closed",
      },
    });

    return NextResponse.json(job);
  } catch {
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

