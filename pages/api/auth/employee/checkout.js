import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { empid } = req.body;

  try {
    const [row] = await db.query(
      "SELECT id, check_in FROM attendance WHERE empid = ? AND date = CURDATE() AND check_out IS NULL ORDER BY id DESC LIMIT 1",
      [empid]
    );

    if (row.length === 0) return res.status(400).json({ error: "No check-in found" });

    const checkInTime = new Date(row[0].check_in);
    const checkOutTime = new Date();
    const hoursWorked = ((checkOutTime - checkInTime) / 1000 / 60 / 60).toFixed(2);

    await db.query(
      "UPDATE attendance SET check_out = NOW(), total_hours = ? WHERE id = ?",
      [hoursWorked, row[0].id]
    );

    res.status(200).json({ message: "Check-out recorded", hours: hoursWorked });
  } catch (err) {
    res.status(500).json({ error: "Check-out failed", details: err.message });
  }
}
