import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    if (req.method !== "PATCH") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed",
      });
    }

    const { resumeId, status } = req.body;

    console.log("STATUS API:", {
      resumeId,
      status,
    });

    if (!resumeId || !status) {
      return res.status(400).json({
        success: false,
        error: "resumeId and status are required",
      });
    }

    const updatedResume = await prisma.parsed_resumes.update({
      where: {
        id: Number(resumeId),
      },
      data: {
        application_status: status,
      },
    });

    return res.status(200).json({
      success: true,
      resume: updatedResume,
    });
  } catch (error) {
    console.error("STATUS API ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}