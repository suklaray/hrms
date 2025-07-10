// /pages/api/auth/employee/update-role/[id].js
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { role } = req.body;

  if (!role || !["admin", "hr", "employee", "superadmin"].includes(role)) {
    return res.status(400).json({ message: "Invalid or missing role" });
  }

  try {
    const updatedUser = await prisma.users.update({
      where: { id: parseInt(id) },
      data: { role },
    });

    return res.status(200).json({ message: "Role updated", updatedUser });
  } catch (error) {
    console.error("Error updating role:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}
