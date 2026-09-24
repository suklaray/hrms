import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
async function checkAuth(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  if (!token) return { error: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return { error: NextResponse.json({ message: 'Invalid token' }, { status: 401 }) };
  }
  const hasAccess =
    (await checkPermission(decoded, PERMISSION_KEYS.EMPLOYEE_EDIT));
  if (!hasAccess) return { error: NextResponse.json({ message: 'Forbidden: insufficient permissions' }, { status: 403 }) };
  return { decoded };
}
export async function DELETE(req: NextRequest, context?: { params?: Promise<any> }) {
  const auth = await checkAuth(req);
  if (auth.error) return auth.error;
  const query = await getQueryParams(req, context?.params);
  const { id } = query;

  

  try {
    // Set user status to Inactive instead of deleting
    await prisma.users.update({
      where: { id: parseInt(id) },
      data: { status: "Inactive" },
    });

    return NextResponse.json({ message: "User made inactive successfully" }, { status: 200 });
  } catch (error) {
    console.error("Prisma Update Error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}


