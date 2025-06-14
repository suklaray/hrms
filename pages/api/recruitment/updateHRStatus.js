import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method === "PUT") {
    const { candidateId, hrStatus } = req.body;

    try {
      let formLink = null;

      if (hrStatus === "Selected") {
        const [existing] = await db.query("SELECT form_link FROM candidates WHERE candidate_id = ?", [candidateId]);

        if (existing.length > 0 && !existing[0].form_link) {
          const baseUrl = `${req.headers.origin || "http://localhost:3000"}`;
          formLink = `${baseUrl}/Recruitment/form/${candidateId}`;
        }
      }


      const updateQuery = formLink
        ? "UPDATE candidates SET status = ?, form_link = ? WHERE candidate_id = ?"
        : "UPDATE candidates SET status = ? WHERE candidate_id = ?";

      const params = formLink
        ? [hrStatus, formLink, candidateId]
        : [hrStatus, candidateId];

      await db.query(updateQuery, params);

      res.status(200).json({ message: "HR Status updated successfully" });
    } catch (error) {
      console.error("Error updating HR Status:", error);
      res.status(500).json({ error: "Server error" });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
