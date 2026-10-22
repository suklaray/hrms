import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAuth } from "@/lib/apiAuth";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { sendShortlistMail } from "@/lib/recruitmentMail";

export async function POST(req: NextRequest) {
  const { error } = await checkAuth(req, [PERMISSION_KEYS.JOB_APPLICATION_SHORTLIST]);
  if (error) return error;

  try {
    const { resumeId } = await req.json();

    if (!resumeId) {
      return NextResponse.json(
        { success: false, error: "resumeId is required" },
        { status: 400 }
      );
    }

    const parsedResumeId = Number(resumeId);

    if (Number.isNaN(parsedResumeId)) {
      return NextResponse.json(
        { success: false, error: "Invalid resumeId" },
        { status: 400 }
      );
    }

    // Get parsed resume
    const resume = await prisma.parsed_resumes.findUnique({
      where: {
        id: parsedResumeId,
      },
    });

    if (!resume) {
      return NextResponse.json(
        { success: false, error: "Parsed resume not found" },
        { status: 404 }
      );
    }

    // Do not shortlist rejected applications
    if (resume.application_status === "Rejected") {
      return NextResponse.json(
        { success: false, error: "A rejected application cannot be shortlisted" },
        { status: 400 }
      );
    }

    // Check whether candidate already exists
    const existingCandidate = await prisma.candidates.findUnique({
      where: {
        parsed_resume_id: parsedResumeId,
      },
    });

    if (existingCandidate) {
      await prisma.parsed_resumes.update({
        where: {
          id: parsedResumeId,
        },
        data: {
          application_status: "Shortlisted",
        },
      });

      let mailSent = false;
      try { await sendShortlistMail(resume.email || "", resume.full_name || "Applicant"); mailSent = true; } catch {}

      return NextResponse.json({
        success: true,
        message: "Candidate is already shortlisted",
        mailSent,
        candidate: existingCandidate,
      });
    }

    //const candidateId = `CAND-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;


    const result = await prisma.$transaction(async (tx) => {
      // Generate date prefix: YYYYMMDD
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const datePrefix = `${year}${month}${day}`;

      // Find the latest candidate created with today's ID prefix
      const lastCandidate = await tx.candidates.findFirst({
        where: {
          candidate_id: {
            startsWith: datePrefix,
          },
        },
        orderBy: {
          candidate_id: "desc",
        },
      });

      // Increment today's serial number
      let nextSerial = 1;

      if (lastCandidate) {
        const lastSerial = parseInt(lastCandidate.candidate_id.slice(-6), 10);

        if (!isNaN(lastSerial)) {
          nextSerial = lastSerial + 1;
        }
      }

      const serialStr = String(nextSerial).padStart(6, "0");
      const candidateId = `${datePrefix}${serialStr}`;

      // Create candidate from parsed resume
      const candidate = await tx.candidates.create({
        data: {
          candidate_id: candidateId,

          // IMPORTANT
          name: resume.full_name || "Unnamed candidate",
          email: resume.email || "",
          contact_number: resume.mobile_number || "",

          // Store the same resume path
          resume: resume.resume_file_path || "",

          // Link candidate to parsed resume
          parsed_resume_id: parsedResumeId,

          status: "Waiting",

          interview_mail_status: "Not Sent",
          form_status: "Mail Not Sent",

          verification: false,
          form_submitted: false,
        },
      });

      // Update application status
      const updatedResume = await tx.parsed_resumes.update({
        where: {
          id: parsedResumeId,
        },
        data: {
          application_status: "Shortlisted",
        },
      });

      return {
        candidate,
        updatedResume,
      };
    });

    let mailSent = false;
    try { await sendShortlistMail(resume.email || "", resume.full_name || "Applicant"); mailSent = true; } catch {}

    return NextResponse.json({
      success: true,
      message: "Candidate shortlisted successfully",
      mailSent,
      candidate: result.candidate,
      resume: result.updatedResume,
    });
  } catch (error) {
    console.error("SHORTLIST API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to shortlist candidate",
      },
      { status: 500 }
    );
  }
}
