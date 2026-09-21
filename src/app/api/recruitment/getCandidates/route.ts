import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  

  try {
    const candidates = await prisma.candidates.findMany({
      orderBy: {
        id: 'desc',
      },
    });

    // Check if each candidate is already an employee
    const candidatesWithEmployeeStatus = await Promise.all(
      candidates.map(async (candidate) => {
        const existingEmployee = await prisma.users.findUnique({
          where: { email: candidate.email },
          select: { empid: true }
        });
        
        return {
          ...candidate,
          isEmployee: !!existingEmployee
        };
      })
    );

    return NextResponse.json(candidatesWithEmployeeStatus, { status: 200 });

  } catch (error) {
    console.error("Error fetching candidates:", error);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}


