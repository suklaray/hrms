import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body;

  try {
    const [user] = await db.query("SELECT empid FROM users WHERE email = ?", [email]);
    if (!user || user.length === 0) return res.status(404).json({ error: "User not found" });

    const [requests] = await db.query(
      "SELECT start_date, end_date, reason, status, created_at FROM leave_requests WHERE empid = ? ORDER BY created_at DESC",
      [user[0].empid]
    );

    const leaveStatus = requests.map((req) => ({
      date: `${req.start_date} to ${req.end_date}`,
      reason: req.reason,
      status: req.status,
    }));

    res.status(200).json({ leaveStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leave status" });
  }
}
