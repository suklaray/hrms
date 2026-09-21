import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getQueryParams } from "@/lib/routeHelper";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { id } = await getQueryParams(req, context?.params);

  if (!id) {
    return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
  }

  try {
    // Fetch from candidate_details table instead of employees
    const candidateDetails = await prisma.candidate_details.findFirst({
      where: {
        candidate_id: id,
      },
      include: {
        addresses: true,
        bank_details: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    if (!candidateDetails) {
      return NextResponse.json({ error: "Candidate details not found" }, { status: 404 });
    }

    // Transform to match existing frontend structure
    const transformedData = {
      empid: candidateDetails.id,
      candidate_id: candidateDetails.candidate_id,
      name: candidateDetails.name,
      email: candidateDetails.email,
      contact_no: candidateDetails.contact_no,
      gender: candidateDetails.gender,
      dob: candidateDetails.dob,
      highest_qualification: candidateDetails.highest_qualification,
      aadhar_number: candidateDetails.aadhar_number,
      pan_number: candidateDetails.pan_number,
      aadhar_card: candidateDetails.aadhar_card,
      pan_card: candidateDetails.pan_card,
      education_certificates: candidateDetails.education_certificates,
      resume: candidateDetails.resume,
      experience_certificate: candidateDetails.experience_certificate,
      profile_photo: candidateDetails.profile_photo,
      created_at: candidateDetails.created_at,
    };

    return NextResponse.json(transformedData, { status: 200 });
  } catch (error) {
    console.error("Error fetching candidate details:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
