import { NextRequest, NextResponse } from "next/server";
import { verifyEmployeeToken } from '@/lib/auth';
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  

  try {
    const user = await verifyEmployeeToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user by id to ensure consistency and include verification fields
    const employee = await prisma.users.findUnique({
      where: { 
        id: Number(user.id) 
      },
      select: {
        empid: true,
        name: true,
        email: true,
        profile_photo: true,
        position: true,
        date_of_joining: true,
        contact_number: true,
        role: true,
        verified: true, // Add verification status
        form_submitted: true // Add form submission status
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    console.log(`Employee profile fetched: ${employee.name} - Verified: ${employee.verified}, Form Submitted: ${employee.form_submitted}`);

    return NextResponse.json(employee, { status: 200 });
  } catch (error) {
    console.error('Employee profile error:', error);
    return NextResponse.json({ error: 'Failed to fetch employee profile' }, { status: 500 });
  }
}

