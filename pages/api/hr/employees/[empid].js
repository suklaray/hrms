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

    // Get additional data from employees table
    const employeeData = await prisma.employees.findFirst({
      where: { 
        OR: [
          { email: user.email },
          { empid: parseInt(empid) }
        ]
      },
      select: {
        contact_no: true,
      },
    });

    const employee = {
      ...user,
      contact_no: employeeData?.contact_no || 'Not provided',
    };

    return res.status(200).json({ employee });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
