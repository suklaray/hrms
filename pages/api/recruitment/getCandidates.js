import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const [rows] = await db.query("SELECT * FROM candidates ORDER BY id DESC");

    if (rows.length === 0) {
      return res.status(200).json({ message: "No candidates found." });  
    }

    res.status(200).json(rows); 
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).json({ message: "Server Error" });
  }
}
