import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  

  const { id } = query;

  if (!id) {
    return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
  }

  try {
    // First try to get from users table
    const user = await prisma.users.findUnique({
      where: { empid: id }
    });

    if (user) {
      return NextResponse.json({
        empid: user.empid,
        name: user.name,
        email: user.email,
        form_submitted: user.form_submitted
      }, { status: 200 });
    }

    // If not found in users, return error
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

