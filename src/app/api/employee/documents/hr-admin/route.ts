import { NextRequest, NextResponse } from "next/server";
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { DecodedToken } from "@/lib/jwtTypes";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {


  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    // Check if HR/Admin/SuperAdmin has submitted documents
    const employee = await prisma.employees.findFirst({
      where: {
        email: decoded.email as string
      },
      select: {
        aadhar_card: true,
        pan_card: true,
        resume: true,
        profile_photo: true,
        education_certificates: true,
        experience_certificate: true,
      }
    });

    // Check if most required documents are submitted
    const requiredDocs = [
      employee?.aadhar_card,
      employee?.pan_card,
      employee?.resume,
      employee?.profile_photo,
      employee?.education_certificates
    ];

    const submittedCount = requiredDocs.filter(doc => doc && doc.trim() !== '').length;
    const submitted = submittedCount >= 4; // At least 4 out of 5 required docs

    return NextResponse.json({ submitted }, { status: 200 });
  } catch (error) {
    console.error("Error checking HR/Admin/SuperAdmin document status:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}


