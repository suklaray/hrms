import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({
        success: false,
        error: "resumeId is required",
      });
    }

    const parsedResumeId = Number(resumeId);

    if (Number.isNaN(parsedResumeId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid resumeId",
      });
    }

    // Get parsed resume
    const resume = await prisma.parsed_resumes.findUnique({
      where: {
        id: parsedResumeId,
      },
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: "Parsed resume not found",
      });
    }

    // Do not shortlist rejected applications
    if (resume.application_status === "Rejected") {
      return res.status(400).json({
        success: false,
        error: "A rejected application cannot be shortlisted",
      });
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

      return res.status(200).json({
        success: true,
        message: "Candidate is already shortlisted",
        candidate: existingCandidate,
      });
    }

    const candidateId =
      `CAND-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await prisma.$transaction(async (tx) => {

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

    return res.status(200).json({
      success: true,
      message: "Candidate shortlisted successfully",
      candidate: result.candidate,
      resume: result.updatedResume,
    });

  } catch (error) {
    console.error("SHORTLIST API ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to shortlist candidate",
    });
  }
}