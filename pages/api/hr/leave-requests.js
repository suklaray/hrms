// /pages/api/hr/leave-requests.js
import pool from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM leave_requests");
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
}
