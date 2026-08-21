import prisma from "@/lib/prisma";
import analyzeJD from "@/lib/jd-analysis/analyzeJD";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const { id } = req.query;

  if (!id || isNaN(Number(id))) {
    return res.status(400).json({
      success: false,
      error: "Invalid job description ID",
    });
  }

  try {
    const jobDescription = await prisma.job_descriptions.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!jobDescription) {
      return res.status(404).json({
        success: false,
        error: "Job description not found",
      });
    }

    const analysis = await analyzeJD(jobDescription);

    return res.status(200).json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error("JD Analysis Error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to analyze job description",
    });
  }
}