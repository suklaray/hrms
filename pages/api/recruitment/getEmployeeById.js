// pages/api/recruitment/getEmployeeById.js
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Candidate ID is required" });
    }

    try {
      const employee = await prisma.employees.findFirst({
        where: {
          candidate_id: id,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      if (!employee) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      return res.status(200).json(employee);
    } catch (error) {
      console.error("Error fetching candidate:", error);
      return res.status(500).json({ error: "Server error" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
