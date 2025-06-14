// /pages/api/recruitment/getCandidateById.js
import db from "@/lib/db"; 
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Candidate ID is required" });
  }

  try {
    const [result] = await db.query("SELECT * FROM candidates WHERE candidate_id = ?", [id]);

    if (result.length === 0) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    res.status(200).json(result[0]);
  } catch (error) {
    console.error("Error fetching candidate:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
