import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET as string);
  } catch {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }

  if (!(await checkPermission(decoded, PERMISSION_KEYS.EMPLOYEE_EDIT))) {
    return NextResponse.json(
      { message: "Forbidden: insufficient permissions" },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  try {
    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) },
      include: {
        rbacRole: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const employee = await prisma.employees.findUnique({
      where: { email: user.email },
    });

    let addresses = [];
    let bankDetails = [];

    if (employee) {
      addresses = await prisma.addresses.findMany({
        where: { employee_id: employee.empid },
      });

      bankDetails = await prisma.bank_details.findMany({
        where: { employee_id: employee.empid },
      });
    }

    const { password: _password, ...safeUser } = user;

    return NextResponse.json({
      user: safeUser,
      employee: employee || null,
      addresses,
      bankDetails,
    }, { status: 200 });

  } catch (error) {
    console.error("Error in employee view API:", error);
    return NextResponse.json({
      message: "Internal Server Error",
      error: (error as Error).message,
    }, { status: 500 });
  }
}
