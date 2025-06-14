import db from "@/lib/db";
import bcrypt from "bcrypt";
import { generateRandomPassword } from "@/utils/helpers"; 
export default async function handler(req, res) {
  if (req.method === "POST") {
    const { candidateId, joiningDate, role, email, name } = req.body;

    if (!candidateId || !joiningDate || !role || !email || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Step 1: Generate a random password
      const password = generateRandomPassword();

      // Step 2: Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Step 3: Insert user into the `users` table
      await db.query(`
        INSERT INTO users (candidate_id, name, email, password, role, candidate_id, joining_date)
        VALUES (?, ?, ?, ?, ?)`, [candidateId, name, email, hashedPassword, role]
      );

      return res.status(200).json({ message: "Employee added successfully" });
    } catch (error) {
      console.error("Error adding employee:", error);
      return res.status(500).json({ error: "Failed to add employee" });
    }
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
