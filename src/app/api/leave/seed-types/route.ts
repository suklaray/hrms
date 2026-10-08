import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const auth = await checkAuth(req);
  if (auth.error) return auth.error;
  if (!auth.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await getRequestBody(req)) || {};
  const { type_name, max_days, paid } = body;
  if (!type_name || !max_days) {
    return NextResponse.json({ message: "Type name and max days are required" }, { status: 400 });
  }

  try {
    const existingLeaveType = await prisma.leave_types.findFirst({
      where: { type_name },
    });

    const requiredPermission = existingLeaveType
      ? PERMISSION_KEYS.LEAVE_EDIT_TYPE
      : PERMISSION_KEYS.LEAVE_CREATE_TYPE;
    if (
      !isSuperAdmin(auth.user) &&
      !auth.permissions?.has(requiredPermission)
    ) {
      return NextResponse.json(
        { message: "Forbidden: insufficient permissions" },
        { status: 403 }
      );
    }

    if (existingLeaveType) {
      await prisma.leave_types.update({
        where: { id: existingLeaveType.id },
        data: {
          max_days: Number(max_days),
          paid: paid !== undefined ? Boolean(paid) : true,
        },
      });
    } else {
      await prisma.leave_types.create({
        data: {
          type_name,
          max_days: Number(max_days),
          paid: paid !== undefined ? Boolean(paid) : true,
        },
      });
    }

    return NextResponse.json({ message: 'Leave type configured successfully' }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Database error' }, { status: 500 });
  }
}
