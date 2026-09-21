import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  const { email } = body;

  try {
    // Check in all three tables: users, employees, and candidates
    const [user, employee, candidate] = await Promise.all([
      prisma.users.findUnique({ where: { email } }),
      prisma.employees.findUnique({ where: { email } }),
      prisma.candidates.findFirst({ where: { email } })
    ]);

    const exists = !!(user || employee || candidate);
    return NextResponse.json({ exists }, { status: 200 });
  } catch (err) {
    console.error("Email check error", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


