import pool from "@/lib/db";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    try {
        const [rows] = await pool.query("SELECT empid, name, email, position FROM users WHERE email = ?", [email]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Employee not found" });
        }

        res.status(200).json({ user: rows[0] });
    } catch (error) {
        console.error("Database Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}
