import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

interface JwtPayload {
  role?: string;
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

function isRecruitmentUser(request: NextRequest): boolean {
  try {
    const token = request.cookies.get("token")?.value;

    if (!token || !process.env.JWT_SECRET) {
      return false;
    }

    const user = jwt.verify(
      token,
      process.env.JWT_SECRET
    ) as JwtPayload;

    return ["hr", "admin", "recruiter", "superadmin"].includes(
      user.role?.toLowerCase() || ""
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!isRecruitmentUser(request)) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const jobs = await prisma.job_descriptions.findMany({
      orderBy: {
        created_at: "desc",
      },
    });

    const parsed = jobs.map((job) => ({
      ...job,
      required_skills: JSON.parse(
        job.required_skills || "[]"
      ),
      preferred_skills: JSON.parse(
        job.preferred_skills || "[]"
      ),
    }));

    return NextResponse.json(parsed, {
      status: 200,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isRecruitmentUser(request)) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
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

  // Validations
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

  if (!experience?.trim()) {
    return NextResponse.json(
      { message: "Experience is required" },
      { status: 400 }
    );
  }

  if (!education?.trim()) {
    return NextResponse.json(
      {
        message: "Educational qualification is required",
      },
      { status: 400 }
    );
  }

  if (!deadline) {
    return NextResponse.json(
      {
        message: "Application deadline is required",
      },
      { status: 400 }
    );
  }

  if (new Date(deadline) <= new Date()) {
    return NextResponse.json(
      {
        message: "Deadline must be a future date",
      },
      { status: 400 }
    );
  }

  try {
    const job = await prisma.job_descriptions.create({
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
        status: status || "Draft",
      },
    });

    return NextResponse.json(
      {
        ...job,
        required_skills,
        preferred_skills,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
