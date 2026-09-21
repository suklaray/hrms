import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function PUT(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  try {
    // Test database connectivity with retry
    let connectionAttempts = 0;
    const maxAttempts = 3;

    while (connectionAttempts < maxAttempts) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        break;
      } catch (dbError) {
        connectionAttempts++;
        if (connectionAttempts >= maxAttempts) {
          return NextResponse.json({ message: "Database connection failed" }, { status: 503 });
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: "No token provided" }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.EMPLOYEE_VERIFY);
    if (!hasAccess) {
      return NextResponse.json({ message: "Access denied: insufficient permissions" }, { status: 403 });
    }

    const { empid, verificationStatus } = body;

    if (!empid || typeof verificationStatus !== 'boolean') {
      return NextResponse.json({ message: "Invalid request data" }, { status: 400 });
    }

    const updatedUser = await prisma.users.update({
      where: { empid: empid },
      data: { verified: verificationStatus ? 'verified' : 'not_verified' },
    });

    // Don't refresh JWT token - admin/HR should keep their own session
    // Only the employee being verified will get updated verification status on next login

    return NextResponse.json({
      message: `Employee ${verificationStatus ? 'verified' : 'unverified'} successfully`,
      user: updatedUser,
    }, { status: 200 });
  } catch (error) {
    console.error("Error updating verification:", error);

    // Handle specific database connectivity errors
    if (error.code === 'P1001' || error.message?.includes("Can't reach database")) {
      return NextResponse.json({
        message: "Database temporarily unavailable",
        error: "Service is temporarily unavailable. Please try again in a few moments.",
        code: 'DB_CONNECTION_ERROR'
      }, { status: 503 });
    }

    return NextResponse.json({
      message: "Internal server error",
      error: error.message
    }, { status: 500 });
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.warn("Failed to disconnect from database:", disconnectError.message);
    }
  }
}

