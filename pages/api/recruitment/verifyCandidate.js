import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "PUT") return res.status(405).json({ error: "Method not allowed" });

  const { candidateId, verificationStatus } = req.body;

  try {
    const result = await prisma.candidates.updateMany({
      where: { candidate_id: String(candidateId) }, 
      data: { verification: verificationStatus },
    });

    res.status(200).json({ message: "Verification status updated", result });
  } catch (error) {
    console.error("Error updating verification status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
