//C:\OfficeWork\hrms\pages\api\recruitment\job-description\[id]\analyze.js
//src/app/api/recruitment/job-description/[id]/analysis/save/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import analyzeJD from "@/lib/jd-analysis/analyzeJD";

interface ApiError {
  status?: number;
  message?: string;
}

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const jobDescriptionId = Number(id);

    if (!id || Number.isNaN(jobDescriptionId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid job description ID",
        },
        { status: 400 }
      );
    }

    const jobDescription = await prisma.job_descriptions.findUnique({
      where: {
        id: jobDescriptionId,
      },
    });

    if (!jobDescription) {
      return NextResponse.json(
        {
          success: false,
          error: "Job description not found",
        },
        { status: 404 }
      );
    }

    const analysis = await analyzeJD(jobDescription);

    return NextResponse.json(
      {
        success: true,
        data: analysis,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("JD Analysis Error:", error);

    const apiError = error as ApiError;

    const status =
      apiError.status === 429 || apiError.status === 503
        ? apiError.status
        : 500;

    const message =
      status === 503
        ? "The AI service is temporarily busy. Please try again in a moment."
        : status === 429
          ? "The AI service rate limit was reached. Please try again shortly."
          : "Failed to analyze job description. Please try again.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}
