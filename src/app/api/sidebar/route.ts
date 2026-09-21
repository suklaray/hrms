import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { isSuperAdmin, getUserPermissions } from "@/lib/rbac";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const superAdminFlag = isSuperAdmin(user);
  const permissions = await getUserPermissions(user);

  return NextResponse.json(
    {
      isSuperAdmin: superAdminFlag,
      permissions: Array.from(permissions),
    },
    { status: 200 }
  );
}
