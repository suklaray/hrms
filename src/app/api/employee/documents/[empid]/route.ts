import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from "@/lib/auth";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  

  try {
    const user = await verifyEmployeeToken(req);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { empid } = query;

    // Check if employee has submitted documents
    const employee = await prisma.employees.findFirst({
      where: { 
        email: user.email 
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
    console.error("Error checking document status:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

