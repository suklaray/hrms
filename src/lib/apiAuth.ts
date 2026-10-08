// src/lib/apiAuth.ts
import { NextRequest, NextResponse } from "next/server";
import { parse } from "cookie";
import { getUserPermissions, isSuperAdmin } from "@/rbac/service";
import getUserFromToken from "@/lib/getUserFromToken";
import type { DecodedToken } from "@/types";

export type AuthResult = {
  user?: DecodedToken & { _resolvedPermissions?: Set<string> };
  permissions?: Set<string>;
  error?: NextResponse;
};

/**
 * Server-side Authentication & Authorization guard for API routes.
 * 1. Authenticates user from JWT token (header or cookie).
 * 2. Loads effective user permissions ONCE at request level.
 * 3. Evaluates required permissions against the resolved Set.
 * 4. Returns { user, permissions } on success, or NextResponse 401 / 403 on failure.
 */
export async function checkAuth(
  req: NextRequest,
  requiredPermissions: string | string[] = []
): Promise<AuthResult> {
  const permissionsRequired = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = parse(cookieHeader);
  const token = cookies.token || req.cookies.get("token")?.value;
  const user = getUserFromToken(token) as (DecodedToken & { _resolvedPermissions?: Set<string> }) | null;

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Load user's effective permissions ONCE per request
  const permissions = await getUserPermissions(user);
  user._resolvedPermissions = permissions;

  if (permissionsRequired.length > 0) {
    if (!isSuperAdmin(user)) {
      const hasAccess = permissionsRequired.some((perm) => permissions.has(perm));
      if (!hasAccess) {
        return {
          error: NextResponse.json(
            { error: "Forbidden: insufficient permissions" },
            { status: 403 }
          ),
        };
      }
    }
  }

  return { user, permissions };
}

/**
 * Guard that requires ALL of the specified permissions.
 */
export async function checkAuthAll(
  req: NextRequest,
  requiredPermissions: string | string[] = []
): Promise<AuthResult> {
  const permissionsRequired = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = parse(cookieHeader);
  const token = cookies.token || req.cookies.get("token")?.value;
  const user = getUserFromToken(token) as (DecodedToken & { _resolvedPermissions?: Set<string> }) | null;

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const permissions = await getUserPermissions(user);
  user._resolvedPermissions = permissions;

  if (permissionsRequired.length > 0) {
    if (!isSuperAdmin(user)) {
      const hasAll = permissionsRequired.every((perm) => permissions.has(perm));
      if (!hasAll) {
        return {
          error: NextResponse.json(
            { error: "Forbidden: insufficient permissions" },
            { status: 403 }
          ),
        };
      }
    }
  }

  return { user, permissions };
}
