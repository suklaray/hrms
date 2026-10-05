// src/app/api/rbac/permissions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { PERMISSIONS } from "@/rbac/permissions";

/**
 * GET /api/rbac/permissions/:id
 * Read-only single permission details.
 */
export async function GET(
  req: NextRequest,
  context?: { params?: Promise<{ id: string }> }
) {
  const auth = await checkAuth(req, [
    PERMISSIONS.RBAC.PERMISSION_VIEW,
    PERMISSIONS.RBAC.ROLE_MANAGE,
    PERMISSIONS.SETTINGS.EMPLOYEE_TYPES_MANAGE,
  ]);
  if (auth.error) return auth.error;

  const params = await context?.params;
  const id = params?.id ? parseInt(params.id, 10) : NaN;
  if (isNaN(id)) return NextResponse.json({ error: "Invalid permission ID" }, { status: 400 });

  const permission = await prisma.permission.findUnique({
    where: { id },
  });

  if (!permission) return NextResponse.json({ error: "Permission not found" }, { status: 404 });
  return NextResponse.json({ permission }, { status: 200 });
}
