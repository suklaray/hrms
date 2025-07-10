// pages/api/auth/employee/update-type/[id].js
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const userId = parseInt(id);
  if (isNaN(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  const { employee_type } = req.body;
  const validTypes = ["Intern", "Full_time", "Contractor"];

  if (!validTypes.includes(employee_type)) {
    return res.status(400).json({ message: "Invalid employee type" });
  }

  try {
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { employee_type },
    });

    return res.status(200).json({ message: "Employee type updated", updatedUser });
  } catch (error) {
    console.error("Error updating employee type:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}
