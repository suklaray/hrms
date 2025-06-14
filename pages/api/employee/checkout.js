import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { empid } = req.body;

  try {
    // 1. Update the status of the user to "Logged Out" in the users table.
    await db.query("UPDATE users SET status = 'Logged Out' WHERE empid = ?", [empid]);

    // 2. Update the check-out time for the user in the attendance table.
    await db.query("UPDATE attendance SET check_out = NOW() WHERE empid = ? AND check_out IS NULL", [empid]);

    res.status(200).json({ message: "Check-out successful" });
  } catch (err) {
    console.error("Check-out failed:", err);
    res.status(500).json({ error: "Check-out failed", details: err.message });
  }
}
