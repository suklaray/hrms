import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, startDate, endDate, reason } = req.body;

  if (!email || !startDate || !endDate || !reason) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const [user] = await db.query("SELECT empid FROM users WHERE email = ?", [email]);
    if (!user || user.length === 0) return res.status(404).json({ error: "User not found" });

    await db.query(
      "INSERT INTO leave_requests (empid, start_date, end_date, reason) VALUES (?, ?, ?, ?)",
      [user[0].empid, startDate, endDate, reason]
    );

    res.status(200).json({ message: "Leave request submitted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
