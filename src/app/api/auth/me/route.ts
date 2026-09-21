import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { getAssignableRolesForUser, isSuperAdmin, getUserPermissions } from "@/lib/rbac";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assignable = await getAssignableRolesForUser(user);
  const assignableRoles = assignable.map((r: any) => r.name);
  const superAdminFlag = isSuperAdmin(user);
  const permissions = await getUserPermissions(user);
  const permissionsList = Array.from(permissions);

  return NextResponse.json({
    user: {
      ...user,
      isSuperAdmin: superAdminFlag,
      permissions: permissionsList,
    },
    authenticated: true,
    assignableRoles,
    isSuperAdmin: superAdminFlag,
    permissions: permissionsList,
  }, { status: 200 });
}

