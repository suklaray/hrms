import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    // Check if user is inactive
    if (user.status === "Inactive") {
      return NextResponse.json({ message: "Access denied. Employee is inactive." }, { status: 403 });
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

    return NextResponse.json({
      user,
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
