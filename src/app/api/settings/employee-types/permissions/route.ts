import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.SETTINGS_EMPLOYEE_TYPES_MANAGE);
  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    // Dynamically fetch all permissions directly from the database table
    const permissions = await prisma.permission.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    });

    const grouped = permissions.reduce((acc: Record<string, any[]>, perm) => {
      const cat = perm.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(perm);
      return acc;
    }, {});

    return NextResponse.json({ grouped }, { status: 200 });
  } catch (error) {
    console.error("Error fetching permissions from DB:", error);
    return NextResponse.json({ error: "Failed to fetch permissions" }, { status: 500 });
  }
}
