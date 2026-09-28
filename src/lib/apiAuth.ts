import { NextRequest, NextResponse } from "next/server";
import { parse } from "cookie";
import { checkAnyPermission } from "@/lib/rbac";
import getUserFromToken from "@/lib/getUserFromToken";
import type { DecodedToken } from "@/types";

type AuthResult = {
  user?: DecodedToken;
  error?: NextResponse;
};

export async function checkAuth(
  req: NextRequest,
  requiredPermissions: string[] = []
): Promise<AuthResult> {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = parse(cookieHeader);
  const token = cookies.token || req.cookies.get("token")?.value;
  const user = getUserFromToken(token);

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (requiredPermissions.length > 0) {
    const hasAccess = await checkAnyPermission(user, requiredPermissions);

    if (!hasAccess) {
      return {
        error: NextResponse.json(
          { error: "Forbidden: insufficient permissions" },
          { status: 403 }
        ),
      };
    }
  }

  return { user };
}
