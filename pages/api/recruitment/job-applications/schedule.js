import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const {
      resumeId,
      interviewDate,
      interviewTimeFrom,
      interviewTimeTo,
    } = req.body;

    if (
      !resumeId ||
      !interviewDate ||
      !interviewTimeFrom ||
      !interviewTimeTo
    ) {
      return res.status(400).json({
        success: false,
        error:
          "resumeId, interviewDate, interviewTimeFrom and interviewTimeTo are required",
      });
    }

    const parsedResumeId = Number(resumeId);

    if (Number.isNaN(parsedResumeId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid resumeId",
      });
    }

    // Make sure the application exists and is shortlisted
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

    if (resume.application_status !== "Shortlisted") {
      return res.status(400).json({
        success: false,
        error: "Only shortlisted candidates can be scheduled",
      });
    }

    // Find candidate created during shortlist
    const candidate = await prisma.candidates.findUnique({
      where: {
        parsed_resume_id: parsedResumeId,
      },
    });

    if (!candidate) {
      return res.status(404).json({
        success: false,
        error: "Candidate record not found. Please shortlist the candidate first.",
      });
    }

    // Convert date to DateTime
    const interviewDateTime = new Date(`${interviewDate}T00:00:00`);

    if (Number.isNaN(interviewDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: "Invalid interview date",
      });
    }

    const updatedCandidate = await prisma.candidates.update({ // Update candidate with interview details
      where: {
        id: candidate.id,
      },
      data: {
        interview_date: interviewDateTime,
        interview_time_from: interviewTimeFrom,
        interview_time_to: interviewTimeTo,

        // Keep candidate status as Waiting unless your workflow
        // requires Pending at this point.
        status: "Pending",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Interview scheduled successfully",
      candidate: updatedCandidate,
    });
  } catch (error) {
    console.error("SCHEDULE API ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Failed to schedule interview",
    });
  }
}