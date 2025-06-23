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
    const employee = await prisma.users.findUnique({
      where: { empid },
      select: {
        empid: true,
        name: true,
        email: true,
        contact_number: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    return res.status(200).json({ employee });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
