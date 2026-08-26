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

    const status = [429, 503].includes(error.status) ? error.status : 500;
    const message = status === 503
      ? "The AI service is temporarily busy. Please try again in a moment."
      : status === 429
        ? "The AI service rate limit was reached. Please try again shortly."
        : "Failed to analyze job description. Please try again.";

    return res.status(status).json({
      success: false,
      error: message,
    });
  }
}