// /pages/api/recruitment/addEmployeeFromCandidate.js
import prisma from "@/lib/prisma";
import bcrypt from "bcrypt";
import { generateRandomPassword } from "@/utils/helpers";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { candidateId, joiningDate, role, email, name } = req.body;

  if (!candidateId || !joiningDate || !role || !email || !name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    //Generate a random password
    const password = generateRandomPassword();

    //Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        candidate_id: candidateId,
        name,
        email,
        password: hashedPassword,
        role,
        joining_date: new Date(joiningDate),
      },
    });

    return res.status(200).json({ message: "Employee added successfully" });
  } catch (error) {
    console.error("Error adding employee:", error);
    return res.status(500).json({ error: "Failed to add employee" });
  }
}
