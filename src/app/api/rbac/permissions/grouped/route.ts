// src/app/api/rbac/permissions/grouped/route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { PERMISSIONS, MODULE_NAMES } from "@/rbac/permissions";

/**
 * GET /api/rbac/permissions/grouped
 * Read-only permissions grouped by module / category for UI role configuration.
 */
export async function GET(req: NextRequest) {
  const auth = await checkAuth(req, [
    PERMISSIONS.RBAC.PERMISSION_VIEW,
    PERMISSIONS.SETTINGS.ROLE_VIEW,
    PERMISSIONS.RBAC.ROLE_PERMISSION_ASSIGN,
  ]);
  if (auth.error) return auth.error;

  try {
    const permissions = await prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ module: "asc" }, { key: "asc" }],
    });

    const grouped: Record<
      string,
      {
        module: string;
        moduleName: string;
        permissions: typeof permissions;
      }
    > = {};

    for (const perm of permissions) {
      const moduleKey = perm.module || perm.category?.toLowerCase() || "general";
      const moduleDisplayName = MODULE_NAMES[moduleKey] || perm.category || moduleKey;

      if (!grouped[moduleKey]) {
        grouped[moduleKey] = {
          module: moduleKey,
          moduleName: moduleDisplayName,
          permissions: [],
        };
      }
      grouped[moduleKey].permissions.push(perm);
    }

    return NextResponse.json({ grouped }, { status: 200 });
  } catch (error) {
    console.error("Error fetching grouped permissions:", error);
    return NextResponse.json({ error: "Failed to fetch grouped permissions" }, { status: 500 });
  }
}
