import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { id } = req.query;

    const candidate = await prisma.candidates.findUnique({
      where: { id: parseInt(id) },
      select: {
        resume_data: true,
        resume_filename: true,
        resume_mimetype: true,
        name: true
      }
    });

    if (!candidate || !candidate.resume_data) {
      return res.status(404).json({ error: "Resume not found" });
    }

    const filename = candidate.resume_filename || `${candidate.name}_resume.pdf`;
    const mimetype = candidate.resume_mimetype || 'application/pdf';

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(candidate.resume_data);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}