import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { logAudit, isAuditApproved } from "@/lib/auditMiddleware";

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
  auditUid?: string;
}

export async function GET(request: NextRequest) {
  const { error } = await checkAuth(request, [PERMISSION_KEYS.JD_VIEW]);
  if (error) return error;

  try {
    const jobs = await prisma.job_descriptions.findMany({
      orderBy: { created_at: "desc" },
    });

    const parsed = jobs.map((job) => ({
      ...job,
      required_skills: JSON.parse(job.required_skills || "[]"),
      preferred_skills: JSON.parse(job.preferred_skills || "[]"),
    }));

    return NextResponse.json(parsed, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error, user } = await checkAuth(request, [PERMISSION_KEYS.JD_CREATE]);
  if (error) return error;

  const body = (await request.json()) as JobDescriptionBody;

  const {
    title, department, employment_type, work_mode, location, openings,
    experience, education, required_skills, preferred_skills, responsibilities,
    summary, salary_min, salary_max, benefits, deadline, hiring_manager,
    interview_process, keywords, status, auditUid,
  } = body;

  // Validations
  if (!title?.trim())
    return NextResponse.json({ message: "Job title is required" }, { status: 400 });

  if (!required_skills?.length)
    return NextResponse.json({ message: "At least one required skill must be provided" }, { status: 400 });

  if (!experience?.trim())
    return NextResponse.json({ message: "Experience is required" }, { status: 400 });

  if (!education?.trim())
    return NextResponse.json({ message: "Educational qualification is required" }, { status: 400 });

  if (!deadline)
    return NextResponse.json({ message: "Application deadline is required" }, { status: 400 });

  if (new Date(deadline) <= new Date())
    return NextResponse.json({ message: "Deadline must be a future date" }, { status: 400 });

  if (status?.toLowerCase() === "published") {
    const { error: publishError } = await checkAuth(request, [PERMISSION_KEYS.JD_PUBLISH]);
    if (publishError) return publishError;

    // Require audit approval only for publishing
    if (!auditUid) {
      const auditLog = await logAudit({
        req: request,
        user,
        action: "jd.create",
        module: "Job Description",
        description: `Request to create new Job Description: "${title.trim()}" | Department: ${department?.trim() || "N/A"} | Employment Type: ${employment_type || "N/A"} | Location: ${location || "N/A"} | Openings: ${openings || "N/A"}`,
        requiresApproval: true,
      });

      return NextResponse.json(
        { message: "Approval required. Audit log created and is pending review.", auditUid: auditLog?.uid, requiresApproval: true },
        { status: 202 }
      );
    }

    const approved = await isAuditApproved(auditUid);
    if (!approved)
      return NextResponse.json({ message: "This action is pending audit approval. Please wait for an auditor to approve it.", requiresApproval: true }, { status: 403 });
  }

  try {
    const job = await prisma.job_descriptions.create({
      data: {
        title: title.trim(),
        department: department?.trim() || "",
        employment_type,
        work_mode,
        location,
        openings: parseInt(String(openings), 10),
        experience,
        education,
        required_skills: JSON.stringify(required_skills),
        preferred_skills: JSON.stringify(preferred_skills || []),
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

    return NextResponse.json({ ...job, required_skills, preferred_skills }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
