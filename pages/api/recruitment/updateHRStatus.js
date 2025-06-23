// pages/api/recruitment/updateHRStatus.js

import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method === "PUT") {
    const { candidateId, hrStatus } = req.body;

    try {
      let formLink = null;

      if (hrStatus === "Selected") {
        const existing = await prisma.candidates.findUnique({
          where: { candidate_id: candidateId },
          select: { form_link: true },
        });

        if (existing && !existing.form_link) {
          const baseUrl = `${req.headers.origin || "http://localhost:3000"}`;
          formLink = `${baseUrl}/Recruitment/form/${candidateId}`;
        }
      }

      if (formLink) {
        await prisma.candidates.update({
          where: { candidate_id: candidateId },
          data: {
            status: hrStatus,
            form_link: formLink,
          },
        });
      } else {
        await prisma.candidates.update({
          where: { candidate_id: candidateId },
          data: {
            status: hrStatus,
          },
        });
      }

      res.status(200).json({ message: "HR Status updated successfully" });
    } catch (error) {
      console.error("Error updating HR Status:", error);
      res.status(500).json({ error: "Server error" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
