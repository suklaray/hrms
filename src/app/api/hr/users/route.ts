import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const hasAccess =
    (await checkPermission(user, PERMISSION_KEYS.EMPLOYEE_VIEW)) ||
    (await checkPermission(user, PERMISSION_KEYS.PAYROLL_VIEW));
  if (!hasAccess) {
    return NextResponse.json({ message: "Access denied: insufficient permissions" }, { status: 403 });
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const users = await prisma.users.findMany({
      select: {
        empid: true,
        name: true,
        email: true,
        contact_number: true,
        role: true,
        payroll: {
          where: {
            generated_on: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          select: {
            id: true,
          },
        },
      },
    });

    const transformedUsers = users.map((u) => ({
      empid: u.empid,
      name: u.name,
      email: u.email,
      phone: u.contact_number,
      role: u.role,
      payrollStatus: u.payroll.length > 0 ? "Generated" : "Pending",
    }));

    return NextResponse.json({ users: transformedUsers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users with payroll:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
