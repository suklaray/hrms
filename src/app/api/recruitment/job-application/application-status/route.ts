import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type ResumeResponse = {
  id: number;
  full_name: string | null;
  email: string | null;
  application_status: string;
};

type ErrorResponse = {
  error: string;
  details?: string;
};

export async function GET(
  req: NextRequest
): Promise<NextResponse<ResumeResponse | ErrorResponse>> {
  const { searchParams } = new URL(req.url);
  const resumeId = Number(searchParams.get("resumeId"));

  if (!resumeId) {
    return NextResponse.json({ error: "resumeId required" }, { status: 400 });
  }

  try {
    const resume = await prisma.parsed_resumes.findUnique({
      where: { id: resumeId },
      select: { id: true, full_name: true, email: true, application_status: true },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json(resume, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: "Server error", details: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest
): Promise<NextResponse<ResumeResponse | ErrorResponse>> {
  try {
    const { resumeId, status } = await req.json();

    if (!resumeId || !status) {
      return NextResponse.json({ error: "resumeId and status required" }, { status: 400 });
    }

    const updated = await prisma.parsed_resumes.update({
      where: { id: Number(resumeId) },
      data: { application_status: status },
      select: { id: true, full_name: true, email: true, application_status: true },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: "Server error", details: message }, { status: 500 });
  }
}
