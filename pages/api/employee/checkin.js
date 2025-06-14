import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { empid } = req.body;

  try {
    // 1. Update the status of the user to "Logged In" in the users table.
    await db.query("UPDATE users SET status = 'Logged In' WHERE empid = ?", [empid]);

    // 2. Insert the check-in record in the attendance table.
    await db.query("INSERT INTO attendance (empid, check_in) VALUES (?, NOW())", [empid]);

    res.status(200).json({ message: "Check-in successful" });
  } catch (err) {
    console.error("Check-in failed:", err);
    res.status(500).json({ error: "Check-in failed", details: err.message });
  }
}
