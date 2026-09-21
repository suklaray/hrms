import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  const { id } = query;

  try {
    // Reconnect to database if connection is lost
    await prisma.$connect();
    
    // 1️⃣ Get the candidate info
    const candidate = await prisma.candidates.findUnique({
      where: { candidate_id: id },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // 2️⃣ Get profile photo from employees table where email matches
    const employee = await prisma.employees.findUnique({
      where: { email: candidate.email },
      select: { 
        profile_photo: true
      },
    });

    let profilePhotoUrl = '';
    if (employee?.profile_photo) {
      profilePhotoUrl = employee.profile_photo;
    }

    return NextResponse.json({
      ...candidate,
      profile_photo: profilePhotoUrl,
    }, { status: 200 });

  } catch (err) {
    console.error('Error fetching candidate/employee:', err);
    
    // If it's a connection error, try to reconnect
    if (err.code === 'P1017') {
      try {
        await prisma.$disconnect();
        await prisma.$connect();
        return NextResponse.json({ error: 'Database connection lost. Please try again.' }, { status: 500 });
      } catch (reconnectErr) {
        console.error('Failed to reconnect:', reconnectErr);
      }
    }
    
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    // Don't disconnect here as it might be used by other requests
  }
}


