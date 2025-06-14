import pool from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
    if (req.method !== "POST")
        return res.status(405).json({ message: "Method Not Allowed" });

    const { email, password } = req.body;

    try {
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        if (users.length === 0)
            return res.status(401).json({ message: "Invalid email or password" });

        const user = users[0];

        // Compare hashed password
        const match = await bcrypt.compare(password, user.password);
        if (!match)
            return res.status(401).json({ message: "Invalid email or password" });

        // JWT Payload
        const payload = {
            id: user.id,
            empid: user.empid,
            name: user.name,
            role: user.role,
            email: user.email,
        };

        // Sign JWT
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

        // Return token
        res.status(200).json({ message: "Login successful", token });
    } catch (error) {
        res.status(500).json({ message: "Error logging in", error: error.message });
    }
}
