import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  

  const { token } = query;

  if (!token) {
    return NextResponse.json({ message: "Token is required" }, { status: 400 });
  }

  try {
    // Find candidate by token
    const candidate = await prisma.candidates.findFirst({
      where: { form_token: token },
      select: {
        candidate_id: true,
        name: true,
        form_token: true,
        ip_address: true,
        device_info: true,
        token_first_used_at: true,
        form_submitted: true,
        created_at: true
      }
    });

    if (!candidate) {
      return NextResponse.json({ message: "Candidate not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Candidate debug info",
      candidate,
      hasIP: !!candidate.ip_address,
      hasDevice: !!candidate.device_info,
      devicePreview: candidate.device_info?.slice(0, 100)
    }, { status: 200 });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

