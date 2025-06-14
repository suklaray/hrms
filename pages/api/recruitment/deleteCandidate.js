import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { candidate_id } = req.query;

  if (!candidate_id) {
    return res.status(400).json({ message: "Candidate ID is required" });
  }

  try {
    const result = await db.query(
      "DELETE FROM candidates WHERE candidate_id = ?",
      [candidate_id]
    );

    return res.status(200).json({ message: "Candidate deleted successfully" });
  } catch (error) {
    console.error("Error deleting candidate:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
