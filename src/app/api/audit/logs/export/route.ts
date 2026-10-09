// GET /api/audit/logs/export — CSV export. Requires audit.export permission.
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { PERMISSIONS } from "@/rbac/permissions";

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req, [PERMISSIONS.AUDIT.EXPORT]);
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const module = searchParams.get("module") ?? undefined;
  const action = searchParams.get("action") ?? undefined;
  const status = searchParams.get("approvalStatus") ?? searchParams.get("status") ?? undefined;
  const from   = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to     = searchParams.get("to")   ? new Date(searchParams.get("to")!)   : undefined;

  const where: Record<string, unknown> = {};
  if (module) where.module = module;
  if (action) where.action = { contains: action };
  if (status) where.currentStatus = status;
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const logs = await prisma.audit_logs.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10000,
    select: {
      uid: true, createdAt: true, userName: true,
      userId: true, userRole: true, action: true,
      module: true, description: true, targetId: true, currentStatus: true,
      oldStatus: true, newStatus: true,
    },
  });

  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const headers = ["UID", "Timestamp", "Performed By", "User ID", "Role", "Action", "Module", "Description", "Target ID", "Old Status", "New Status", "Status"];
  const rows = logs.map((l) =>
    [l.uid, new Date(l.createdAt).toISOString(), l.userName ?? "", l.userId ?? "",
     l.userRole ?? "", l.action, l.module, l.description ?? "", l.targetId ?? "",
     l.oldStatus ?? "", l.newStatus ?? "", l.currentStatus]
    .map(escape).join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
