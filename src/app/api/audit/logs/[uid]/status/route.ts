// GET  /api/audit/logs/[uid]/status — check approval status of a specific audit log (any authenticated user).
// PATCH /api/audit/logs/[uid]/status — approve or reject a pending audit log.
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { PERMISSIONS } from "@/rbac/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  // Any logged-in user can poll their own audit UID
  const auth = await checkAuth(req, []);
  if (auth.error) return auth.error;

  const { uid } = await params;
  const log = await prisma.audit_logs.findUnique({
    where: { uid },
    select: { currentStatus: true },
  });
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ currentStatus: log.currentStatus });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const auth = await checkAuth(req, [PERMISSIONS.AUDIT.UPDATE_STATUS]);
  if (auth.error) return auth.error;

  const { uid } = await params;
  const body = await req.json().catch(() => ({}));
  const status: string = body.status;

  if (status !== "APPROVED" && status !== "REJECTED") {
    return NextResponse.json({ error: "status must be APPROVED or REJECTED" }, { status: 400 });
  }

  const log = await prisma.audit_logs.findUnique({ where: { uid } });
  if (!log) return NextResponse.json({ error: "Audit log not found" }, { status: 404 });
  if (log.currentStatus !== "PENDING") {
    return NextResponse.json(
      { error: `Cannot update: current status is '${log.currentStatus}'` },
      { status: 409 }
    );
  }

  const reviewer = auth.user!;
  const reviewerId = Number(reviewer.id);

  if (status === "APPROVED" && log.action === "jd.close") {
    const jobId = Number(log.targetId);
    if (!Number.isInteger(jobId) || jobId <= 0) {
      return NextResponse.json({ error: "Close request has an invalid job description ID" }, { status: 400 });
    }

    const approvalResult = await prisma.$transaction(async (transaction) => {
      const job = await transaction.job_descriptions.findUnique({
        where: { id: jobId },
        select: { id: true },
      });
      if (!job) return "missing";

      const auditUpdate = await transaction.audit_logs.updateMany({
        where: { uid, currentStatus: "PENDING" },
        data: {
          currentStatus: "APPROVED",
          oldStatus: log.currentStatus,
          newStatus: status,
          reviewedBy: Number.isFinite(reviewerId) && reviewerId > 0 ? reviewerId : null,
          reviewedAt: new Date(),
        },
      });
      if (auditUpdate.count !== 1) return "reviewed";

      await transaction.job_descriptions.update({
        where: { id: jobId },
        data: { status: "Closed" },
      });
      return "approved";
    });

    if (approvalResult === "missing") {
      return NextResponse.json({ error: "Job description for this close request was not found" }, { status: 404 });
    }
    if (approvalResult === "reviewed") {
      return NextResponse.json(
        { error: "This audit request has already been reviewed" },
        { status: 409 }
      );
    }
  } else {
    const result = await prisma.audit_logs.updateMany({
      where: { uid, currentStatus: "PENDING" },
      data: {
        currentStatus: status as "APPROVED" | "REJECTED",
        oldStatus: log.currentStatus,
        newStatus: status,
        reviewedBy: Number.isFinite(reviewerId) && reviewerId > 0 ? reviewerId : null,
        reviewedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      return NextResponse.json(
        { error: "This audit request has already been reviewed" },
        { status: 409 }
      );
    }
  }

  return NextResponse.json({
    message: status === "APPROVED" && log.action === "jd.close"
      ? "Audit approved and job description closed"
      : `Audit log ${status.toLowerCase()} successfully`,
  });
}
