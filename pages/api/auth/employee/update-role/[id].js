// /pages/api/auth/employee/update-role/[id].js
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Check authentication
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !['admin', 'hr', 'superadmin'].includes(decoded.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
  } catch (authError) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { role } = req.body;

  if (!role || !["admin", "hr", "employee", "superadmin"].includes(role)) {
    return res.status(400).json({ message: "Invalid or missing role" });
  }

  try {
    const updatedUser = await prisma.users.update({
      where: { empid: id },
      data: { role },
    });

    return res.status(200).json({ message: "Role updated successfully", updatedUser });
  } catch (error) {
    console.error("Error updating role:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}
