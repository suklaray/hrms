import prisma from "@/lib/prisma";
export default async function handler(req, res) {
  const jobId = Number(req.query.id);

  if (!Number.isInteger(jobId)) {
    return res.status(400).json({ success: false, error: "Invalid job description ID" });
  }

  try {
    if (req.method === "POST") {
      const { candidateId, action, interviewDate, interviewTimeFrom, interviewTimeTo } = req.body || {};

      if (!candidateId || !["SHORTLISTED", "REJECTED", "INTERVIEW"].includes(action)) {
        return res.status(400).json({ success: false, error: "Candidate action is required" });
      }

      const data = {
        status: action === "SHORTLISTED" || action === "INTERVIEW" ? "Selected" : "Rejected"
      };

      if (action === "INTERVIEW") {
        if (!interviewDate) {
          return res.status(400).json({ success: false, error: "Interview date is required" });
        }

        data.interview_date = new Date(interviewDate);
        data.interview_time_from = interviewTimeFrom || null;
        data.interview_time_to = interviewTimeTo || null;
      }

      const candidate = await prisma.candidates.update({
        where: { candidate_id: candidateId },
        data
      });

      return res.status(200).json({ success: true, candidate });
    }

    if (req.method !== "GET") {
      return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const job = await prisma.job_descriptions.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        department: true
      }
    });

    if (!job) {
      return res.status(404).json({ success: false, error: "Job description not found" });
    }

    const profiles = await prisma.parsed_resumes.findMany({
      where: {
        parsing_status: "DONE",
        job_description_id: jobId
      },
      orderBy: {
        matching_score: "desc"
      }
    });

    const results = profiles.map((profile) => ({
      profileId: profile.id,
      candidate: {
        name: profile.full_name || "Unnamed applicant",
        email: profile.email || "No email",
        status: profile.application_status || "Waiting"
      },
      score: profile.matching_score ?? 0
    }));

    return res.status(200).json({
      success: true,
      job,
      results,
      totalEligible: profiles.length,
      totalMatched: results.length
    });
  } catch (error) {
    console.error("Candidate matching error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to load candidate matches"
    });
  }
}