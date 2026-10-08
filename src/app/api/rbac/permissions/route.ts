// src/app/api/rbac/permissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { PERMISSIONS } from "@/rbac/permissions";

/**
 * GET /api/rbac/permissions
 * Read-only list of available permissions.
 * Permissions are developer-controlled in code and synced to the database.
 * No standard POST/DELETE CRUD is exposed to normal administrators.
 */
export async function GET(req: NextRequest) {
  const auth = await checkAuth(req, [
    PERMISSIONS.RBAC.PERMISSION_VIEW,
    PERMISSIONS.SETTINGS.ROLE_VIEW,
    PERMISSIONS.RBAC.ROLE_PERMISSION_ASSIGN,
  ]);
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  const moduleFilter = url.searchParams.get("module");
  const search = url.searchParams.get("search");

  try {
    const where: any = { isActive: true };

    if (moduleFilter) {
      where.module = moduleFilter;
    }

    if (search) {
      where.OR = [
        { key: { contains: search } },
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const permissions = await prisma.permission.findMany({
      where,
      orderBy: [{ module: "asc" }, { key: "asc" }],
    });

    return NextResponse.json({ permissions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}
