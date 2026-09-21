import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getRequestBody } from "@/lib/routeHelper";

export async function PUT(req: NextRequest) {
  const { candidateId, hrStatus } = (await getRequestBody(req)) || {};

  try {
    let formLink = null;

    if (hrStatus === "Selected") {
      const existing = await prisma.candidates.findUnique({
        where: { candidate_id: candidateId },
        select: { form_link: true },
      });

      if (existing && !existing.form_link) {
        const baseUrl = `${req.headers.get("origin") || "http://localhost:3000"}`;
        formLink = `${baseUrl}/Recruitment/form/${candidateId}`;
      }
    }

    if (formLink) {
      await prisma.candidates.update({
        where: { candidate_id: candidateId },
        data: {
          status: hrStatus,
          form_link: formLink,
        },
      });
    } else {
      await prisma.candidates.update({
        where: { candidate_id: candidateId },
        data: {
          status: hrStatus,
        },
      });
    }

    return NextResponse.json({ message: "HR Status updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating HR Status:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
