// GET /api/audit/logs — paginated audit log listing. Requires audit.view permission.
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { PERMISSIONS } from "@/rbac/permissions";

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req, [PERMISSIONS.AUDIT.VIEW]);
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;

  // Frontend requests distinct module list for filter dropdown
  if (searchParams.get("distinct") === "modules") {
    const rows = await prisma.audit_logs.findMany({
      select: { module: true },
      distinct: ["module"],
      orderBy: { module: "asc" },
    });
    return NextResponse.json(rows.map((r) => r.module));
  }

  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip   = (page - 1) * limit;

  const module         = searchParams.get("module")         ?? undefined;
  const action         = searchParams.get("action")         ?? undefined;
  // frontend sends "approvalStatus", also accept "status"
  const status         = searchParams.get("approvalStatus") ?? searchParams.get("status") ?? undefined;
  const userId         = searchParams.get("userId")         ?? undefined;
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to   = searchParams.get("to")   ? new Date(searchParams.get("to")!)   : undefined;

  const where: Record<string, unknown> = {};
  if (module) where.module = module;
  if (action) where.action = { contains: action };
  if (status) where.currentStatus = status;
  if (userId) where.userId = parseInt(userId, 10);
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const [total, logs] = await Promise.all([
    prisma.audit_logs.count({ where }),
    prisma.audit_logs.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true, uid: true,
        userId: true, userName: true, userRole: true,
        user: { select: { empid: true } },
        action: true, module: true, description: true, targetId: true,
        currentStatus: true, oldStatus: true, newStatus: true,
        reviewedBy: true, reviewedAt: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({
    data: logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
