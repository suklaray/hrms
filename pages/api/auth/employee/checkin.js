import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { empid } = req.body;

  try {
    const [result] = await db.query(
      "INSERT INTO attendance (empid, check_in) VALUES (?, NOW())",
      [empid]
    );
    res.status(200).json({ message: "Check-in recorded" });
  } catch (err) {
    res.status(500).json({ error: "Check-in failed", details: err.message });
  }
}
