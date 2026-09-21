import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import type { DecodedToken } from "@/lib/jwtTypes";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function PUT(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  const params = context?.params ? await context.params : {};
  const id = (params as any)?.id;

  try {
    // Check authentication
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: "Access denied" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.EMPLOYEE_EDIT);
    if (!hasAccess) {
      return NextResponse.json({ message: "Access denied: insufficient permissions" }, { status: 403 });
    }

    const { position } = body;

    if (!position || typeof position !== 'string') {
      return NextResponse.json({ message: "Invalid or missing position" }, { status: 400 });
    }

    const updatedUser = await prisma.users.update({
      where: { empid: id },
      data: { position },
    });

    return NextResponse.json({ message: "Position updated successfully", updatedUser }, { status: 200 });
  } catch (error) {
    console.error("Error updating position:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

