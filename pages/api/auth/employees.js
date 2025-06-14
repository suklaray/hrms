import pool from "@/lib/db"; 

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE role = 'employee'");
        res.status(200).json(rows);
    } catch (error) {
        console.error("DB Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
