import prisma from "@/lib/prisma";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { candidateId } = req.body;

  if (!candidateId) {
    return res.status(400).json({ message: "Missing candidateId" });
  }

  try {
    // Generate a SHA-256 hash of the candidate ID to create a unique form link
    const hash = crypto.createHash("sha256").update(candidateId).digest("hex");

    // Define the base URL and build the form link using the hash
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const formLink = `${baseUrl}/Recruitment/form/${hash}`;

    // Update the candidate record with the generated form link
    const result = await prisma.candidates.updateMany({
      where: { candidate_id: candidateId },
      data: { form_link: formLink }
    });

    // Check if any record was updated
    if (result.count === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.status(200).json({ message: "Form link generated successfully", formLink });
  } catch (error) {
    console.error("Error generating form link:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
