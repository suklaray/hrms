import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { logAudit, isAuditApproved } from "@/lib/auditMiddleware";

interface RouteContext {
  params: Promise<{ id: string }>;
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
  auditUid?: string;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { error } = await checkAuth(request, [PERMISSION_KEYS.JD_VIEW, PERMISSION_KEYS.JD_EDIT]);
  if (error) return error;

  const { id } = await params;
  const jdId = parseInt(id, 10);
  if (Number.isNaN(jdId))
    return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

  try {
    const job = await prisma.job_descriptions.findUnique({ where: { id: jdId } });
    if (!job) return NextResponse.json({ message: "Not found" }, { status: 404 });

    return NextResponse.json({
      ...job,
      required_skills: JSON.parse(job.required_skills || "[]"),
      preferred_skills: JSON.parse(job.preferred_skills || "[]"),
    });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { error, user } = await checkAuth(request, [PERMISSION_KEYS.JD_EDIT]);
  if (error) return error;

  const { id } = await params;
  const jdId = parseInt(id, 10);
  if (Number.isNaN(jdId))
    return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

  const body = (await request.json()) as JobDescriptionBody;
  const {
    title, department, employment_type, work_mode, location, openings,
    experience, education, required_skills, preferred_skills, responsibilities,
    summary, salary_min, salary_max, benefits, deadline, hiring_manager,
    interview_process, keywords, status, auditUid,
  } = body;

  if (!title?.trim())
    return NextResponse.json({ message: "Job title is required" }, { status: 400 });
  if (!required_skills?.length)
    return NextResponse.json({ message: "At least one required skill must be provided" }, { status: 400 });
  if (!deadline)
    return NextResponse.json({ message: "Deadline is required" }, { status: 400 });
  if (new Date(deadline) <= new Date())
    return NextResponse.json({ message: "Deadline must be a future date" }, { status: 400 });

  const existingJob = await prisma.job_descriptions.findUnique({ where: { id: jdId } });
  if (!existingJob) return NextResponse.json({ message: "Not found" }, { status: 404 });

  // Step 1 — create audit log and wait for approval
  if (!auditUid) {
    const changes: string[] = [];
    if (title?.trim() && title.trim() !== existingJob.title) changes.push(`Title: "${existingJob.title}" → "${title.trim()}"`);
    if (status && status !== existingJob.status) changes.push(`Status: "${existingJob.status}" → "${status}"`);
    if (department?.trim() && department.trim() !== existingJob.department) changes.push(`Department: "${existingJob.department}" → "${department.trim()}"`);

    const auditLog = await logAudit({
      req: request,
      user,
      action: "jd.update",
      module: "Job Description",
      description: `Request to update Job Description: "${existingJob.title}" (ID: ${jdId})${changes.length ? ` | Changes: ${changes.join(", ")}` : ""}`,
      targetId: String(jdId),
      requiresApproval: true,
    });

    return NextResponse.json(
      { message: "Approval required. Audit log created and is pending review.", auditUid: auditLog?.uid, requiresApproval: true },
      { status: 202 }
    );
  }

  // Step 2 — check approval
  const approved = await isAuditApproved(auditUid);
  if (!approved)
    return NextResponse.json({ message: "This action is pending audit approval. Please wait for an auditor to approve it.", requiresApproval: true }, { status: 403 });

  if (status?.toLowerCase() === "published" && existingJob.status?.toLowerCase() !== "published") {
    const { error: publishError } = await checkAuth(request, [PERMISSION_KEYS.JD_PUBLISH]);
    if (publishError) return publishError;
  }

  try {
    const job = await prisma.job_descriptions.update({
      where: { id: jdId },
      data: {
        title: title!.trim(),
        department: department?.trim() || "",
        employment_type, work_mode, location,
        openings: parseInt(String(openings), 10),
        experience, education,
        required_skills: JSON.stringify(required_skills),
        preferred_skills: JSON.stringify(preferred_skills || []),
        responsibilities, summary,
        salary_min: salary_min || null,
        salary_max: salary_max || null,
        benefits: benefits || null,
        deadline: new Date(deadline!),
        hiring_manager,
        interview_process: interview_process || null,
        keywords: keywords || null,
        status,
      },
    });

    return NextResponse.json({ ...job, required_skills, preferred_skills });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// Close a job description
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { error, user } = await checkAuth(request, [PERMISSION_KEYS.JD_CLOSE]);
  if (error) return error;

  const { id } = await params;
  const jdId = parseInt(id, 10);
  if (Number.isNaN(jdId))
    return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

  const body = await request.json().catch(() => ({})) as { auditUid?: string };

  const existingJob = await prisma.job_descriptions.findUnique({ where: { id: jdId } });
  if (!existingJob) return NextResponse.json({ message: "Not found" }, { status: 404 });

  // Step 1 — create audit log
  if (!body.auditUid) {
    const auditLog = await logAudit({
      req: request,
      user,
      action: "jd.close",
      module: "Job Description",
      description: `Request to close Job Description: "${existingJob.title}" (ID: ${jdId}) | Current Status: "${existingJob.status}"`,
      targetId: String(jdId),
      requiresApproval: true,
    });

    return NextResponse.json(
      { message: "Approval required. Audit log created and is pending review.", auditUid: auditLog?.uid, requiresApproval: true },
      { status: 202 }
    );
  }

  // Step 2 — check approval
  const approved = await isAuditApproved(body.auditUid);
  if (!approved)
    return NextResponse.json({ message: "This action is pending audit approval. Please wait for an auditor to approve it.", requiresApproval: true }, { status: 403 });

  try {
    const job = await prisma.job_descriptions.update({ where: { id: jdId }, data: { status: "Closed" } });
    return NextResponse.json(job);
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// Delete a job description
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { error, user } = await checkAuth(request, [PERMISSION_KEYS.JD_EDIT]);
  if (error) return error;

  const { id } = await params;
  const jdId = parseInt(id, 10);
  if (Number.isNaN(jdId))
    return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

  const body = await request.json().catch(() => ({})) as { auditUid?: string };

  const existingJob = await prisma.job_descriptions.findUnique({ where: { id: jdId } });
  if (!existingJob) return NextResponse.json({ message: "Not found" }, { status: 404 });

  // Step 1 — create audit log
  if (!body.auditUid) {
    const auditLog = await logAudit({
      req: request,
      user,
      action: "jd.delete",
      module: "Job Description",
      description: `Request to delete Job Description: "${existingJob.title}" (ID: ${jdId}) | Department: ${existingJob.department || "N/A"} | Status: "${existingJob.status}"`,
      targetId: String(jdId),
      requiresApproval: true,
    });

    return NextResponse.json(
      { message: "Approval required. Audit log created and is pending review.", auditUid: auditLog?.uid, requiresApproval: true },
      { status: 202 }
    );
  }

  // Step 2 — check approval
  const approved = await isAuditApproved(body.auditUid);
  if (!approved)
    return NextResponse.json({ message: "This action is pending audit approval. Please wait for an auditor to approve it.", requiresApproval: true }, { status: 403 });

  try {
    await prisma.job_descriptions.delete({ where: { id: jdId } });
    return NextResponse.json({ message: "Job description deleted successfully" });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
