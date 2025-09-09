// pages/api/auth/employee/update-type/[id].js
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

  const { employee_type } = req.body;
  const validTypes = ["Intern", "Full_time", "Contractor"];

  if (!employee_type || !validTypes.includes(employee_type)) {
    return res.status(400).json({ message: "Invalid employee type" });
  }

  try {
    // Convert id to string to match empid type
    const empidStr = String(id);
    
    const updatedUser = await prisma.users.update({
      where: { empid: empidStr },
      data: { employee_type },
    });

    return res.status(200).json({ message: "Employee type updated successfully", updatedUser });
  } catch (error) {
    console.error("Error updating employee type:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}