import pool from "@/lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        //  if user already exists
        const [existingUser] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: "User already exists." });
        }

        // Generate empid (based on name + random digits)
        const empid = `${name.toLowerCase().replace(/\s/g, "")}_${Math.floor(1000 + Math.random() * 9000)}`;

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert into users table
        await pool.query(
            "INSERT INTO users (empid, name, email, password, role) VALUES (?, ?, ?, ?, ?)",
            [empid, name, email, hashedPassword, role]
        );

        // Generate JWT token
        const token = jwt.sign(
            { empid, name, email, role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            message: "User registered successfully!",
            token,
            user: { empid, name, email, role },
        });

    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
