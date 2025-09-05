// pages/api/auth/employees.js

import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const { role } = req.query;

  try {
    const filters = {
      status: { not: "Inactive" } // Exclude inactive employees
    };

    // If role is given in query string, e.g. ?role=HR
    if (role && typeof role === "string" && role !== "All") {
      filters.role = role;
    }

    const users = await prisma.users.findMany({
      where: filters,
      select: {
        id: true,
        empid: true,
        name: true,
        email: true,
        position: true,
        experience: true,
        role: true,
        employee_type: true,
        date_of_joining: true,
        status: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
}
