// pages/api/hr/employee/[empid].js

import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const {
    query: { empid },
    method,
  } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { empid },
    });

    if (!user) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Check if user is inactive
    if (user.status === "Inactive") {
      return res.status(403).json({ message: "Access denied. Employee is inactive." });
    }

    const employee = {
      ...user,
      contact_no: 'Not provided',
    };

    return res.status(200).json({ employee });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
