import db from "@/lib/db";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
    if (req.method === "POST") {
        const { empid, name, email, password, position, date_of_joining, status, experience, role } = req.body;

        if (!empid || !name || !email || !password) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        try {
            // Hash the password
            const hashedPassword = await bcrypt.hash(password, 10);

            await db.query(
                `INSERT INTO users (empid, name, email, password, position, date_of_joining, status, experience, role) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [empid, name, email, hashedPassword, position, date_of_joining, status, experience, role || "employee"]
            );

            return res.status(201).json({ success: true, message: "Employee registered successfully" });
        } catch (error) {
            console.error("Database error:", error);
            return res.status(500).json({ success: false, message: "Database error" });
        }
    } else {
        return res.status(405).json({ success: false, message: "Method Not Allowed" });
    }
}
