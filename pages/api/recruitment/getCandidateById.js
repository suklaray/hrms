import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Candidate ID is required" });
  }

  try {
    const candidate = await prisma.candidates.findFirst({
      where: {
        candidate_id: id,
      },
    });

    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Handle resume data - prioritize database storage over URL
    let resumeUrl = null;
    if (candidate.resume_data && candidate.resume_filename) {
      // Create a download URL for the resume stored in database
      resumeUrl = `/api/recruitment/download-resume/${candidate.id}`;
    } else if (candidate.resume) {
      // Fallback to URL if no database data
      resumeUrl = candidate.resume;
    }

    const responseData = {
      ...candidate,
      resume: resumeUrl
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error("Error fetching candidate:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
