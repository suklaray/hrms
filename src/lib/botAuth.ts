import { NextRequest, NextResponse } from "next/server";
import { checkPermission } from "@/lib/rbac";
import { getUserFromToken } from "@/lib/getUserFromToken";

export async function checkBotPermission(
  request: NextRequest,
  requiredPermission: string
) {
  const token =
    request.cookies.get("token")?.value ||
    request.cookies.get("employeeToken")?.value;
  const user = getUserFromToken(token);

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!(await checkPermission(user, requiredPermission))) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: insufficient permissions" },
        { status: 403 }
      ),
    };
  }

  return { user };
}
