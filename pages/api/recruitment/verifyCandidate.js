// pages/api/recruitment/verifyCandidate.js

import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method === 'PUT') {
    const { candidateId, verificationStatus } = req.body;

    try {
      const result = await prisma.candidates.updateMany({
        where: { candidate_id: candidateId },
        data: { verification: verificationStatus },
      });

      if (result.count === 0) {
        return res.status(404).json({ message: 'Candidate not found' });
      }

      res.status(200).json({ message: 'Verification status updated successfully' });
    } catch (error) {
      console.error("Error updating verification status:", error);
      res.status(500).json({ message: 'Error updating verification status' });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
