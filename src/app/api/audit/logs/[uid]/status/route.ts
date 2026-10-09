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

  await prisma.audit_logs.update({
    where: { uid },
    data: {
      currentStatus: status as "APPROVED" | "REJECTED",
      oldStatus: log.currentStatus,
      newStatus: status,
      reviewedBy: Number.isFinite(reviewerId) && reviewerId > 0 ? reviewerId : null,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ message: `Audit log ${status.toLowerCase()} successfully` });
}
