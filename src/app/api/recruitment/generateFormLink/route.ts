import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { getRequestBody } from "@/lib/routeHelper";

export async function POST(req: NextRequest) {
  const { candidateId } = (await getRequestBody(req)) || {};

  if (!candidateId) {
    return NextResponse.json({ message: "Missing candidateId" }, { status: 400 });
  }

  try {
    const token = crypto.randomBytes(16).toString("hex"); // 32-character random token
    const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || req.nextUrl.host;
    const baseUrl = `${protocol}://${host}`;

    const formLink = `${baseUrl}/Recruitment/form/${token}`;

    // Update the candidate record with the generated form link
    const result = await prisma.candidates.updateMany({
      where: { candidate_id: candidateId },
      data: {
        form_link: formLink,
        form_token: token,
        form_submitted: false,
        token_expiry: expiry,
        ip_address: null,
        device_info: null,
        token_first_used_at: null,
      },
    });

    // Check if any record was updated
    if (result.count === 0) {
      return NextResponse.json({ message: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Form link generated successfully", formLink }, { status: 200 });
  } catch (error) {
    console.error("Error generating form link:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
