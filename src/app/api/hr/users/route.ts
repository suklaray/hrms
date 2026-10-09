import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {

  const auth = await checkAuth(req, [
    PERMISSION_KEYS.EMPLOYEE_VIEW,
    PERMISSION_KEYS.PAYROLL_VIEW,
    PERMISSION_KEYS.JD_CREATE
  ]);
  if (auth.error) return auth.error;

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
        rbacRole: { select: { id: true, name: true } },
        payroll: {
          where: {
            generated_at: {
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
      rbacRole: u.rbacRole,
      payrollStatus: u.payroll.length > 0 ? "Generated" : "Pending",
    }));

    return NextResponse.json({ users: transformedUsers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users with payroll:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
