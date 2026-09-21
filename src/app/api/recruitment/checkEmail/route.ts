import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  

  try {
    const { email } = query;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const [existingCandidate, existingUser, existingEmployee] = await Promise.all([
      prisma.candidates.findFirst({ where: { email: email } }),
      prisma.users.findFirst({ where: { email: email } }),
      prisma.employees.findFirst({ where: { email: email } })
    ]);

    const exists = !!(existingCandidate || existingUser || existingEmployee);
    return NextResponse.json({ exists }, { status: 200 });
  } catch (error) {
    console.error('Error checking email:', error);
    return NextResponse.json({ error: 'Failed to check email' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

