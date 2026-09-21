import { getRequestBody } from "@/lib/routeHelper";
import type { DecodedToken } from "@/lib/jwtTypes";
import { NextRequest, NextResponse } from "next/server";
// pages/api/auth/employee/update-type/[id].js
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
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
  } catch (authError) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  const { employee_type } = body;
  const validTypes = ["Intern", "Full_time", "Contractor"];

  if (!employee_type || !validTypes.includes(employee_type)) {
    return NextResponse.json({ message: "Invalid employee type" }, { status: 400 });
  }

  try {
    // Convert id to string to match empid type
    const empidStr = String(id);

    const updatedUser = await prisma.users.update({
      where: { empid: empidStr },
      data: { employee_type },
    });

    return NextResponse.json({ message: "Employee type updated successfully", updatedUser }, { status: 200 });
  } catch (error) {
    console.error("Error updating employee type:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}

