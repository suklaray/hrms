import { getQueryParams } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const query = await getQueryParams(req, context?.params);

  

  const { id } = query;

  if (!id) {
    return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
  }

  try {
    const candidate = await prisma.candidates.findFirst({
      where: {
        candidate_id: id,
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    const responseData = {
      ...candidate,
      resume: candidate.resume
    };

    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.error("Error fetching candidate:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


