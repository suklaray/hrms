import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { checkAuth } from "@/lib/apiAuth";

export async function GET(req: NextRequest) {
  const auth = await checkAuth(req, [PERMISSION_KEYS.PAYROLL_VIEW]);
  if ("error" in auth) return auth.error;

  try {
    const configurations = await prisma.payroll_configuration.findMany({
      include: {
        company: true,
        financial_year: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json({ success: true, data: configurations }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching configurations:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
