// pages/api/recruitment/getEmployeeById.js
import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Candidate ID is required" });
    }

    try {
      const [rows] = await db.query(
        "SELECT * FROM employees WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1",
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      return res.status(200).json(rows[0]);
    } catch (error) {
      console.error("Error fetching candidate:", error);
      return res.status(500).json({ error: "Server error" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
