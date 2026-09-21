import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  

  const { token } = body;
  if (!token) return NextResponse.json({ error: "Token is required" }, { status: 401 });
  const candidate = await prisma.candidates.findFirst({ where: { form_token: token } });
  if (!candidate) return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });

  try {

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      formSubmitted: candidate.form_submitted || false 
    }, { status: 200 });
  } catch (error) {
    console.error('Error checking form status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

