// /pages/api/hr/employees.js
import db from "@/lib/db"; // Your MySQL/MariaDB connection pool

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const [rows] = await db.query(`
      SELECT empid, name, email, contact_number AS phone
      FROM users
      WHERE role = 'employee'
    `);

    return res.status(200).json({ employees: rows });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
