import db from "@/lib/db";
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
    // Hash the candidateId using a secure hashing algorithm (SHA-256)
    const hash = crypto.createHash('sha256').update(candidateId).digest('hex');

    // Generate a unique form link with the hashed candidateId
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const formLink = `${baseUrl}/Recruitment/form/${hash}`;

    // Update candidate record with the generated form link
    const [result] = await db.query(
      "UPDATE candidates SET form_link = ? WHERE candidate_id = ?",
      [formLink, candidateId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    res.status(200).json({ message: "Form link generated successfully", formLink });
  } catch (error) {
    console.error("Error generating form link:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
