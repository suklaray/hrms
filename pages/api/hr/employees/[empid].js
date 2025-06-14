// pages/api/hr/employee/[empid].js

import db from "@/lib/db";

export default async function handler(req, res) {
  const {
    query: { empid },
    method,
  } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const [rows] = await db.query("SELECT empid, name, email, contact_number FROM users WHERE empid = ?", [empid]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.status(200).json({ employee: rows[0] });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
