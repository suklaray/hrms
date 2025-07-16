// /pages/api/hr/users.js
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const users = await prisma.users.findMany({
      select: {
        empid: true,
        name: true,
        email: true,
        contact_number: true,
        role: true,
        payroll: {
          where: {
            generated_date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          select: {
            id: true, 
          },
        },
      },
    });

    const transformedUsers = users.map((user) => ({
      empid: user.empid,
      name: user.name,
      email: user.email,
      phone: user.contact_number,
      role: user.role,
      payrollStatus: user.payroll.length > 0 ? "Generated" : "Pending",
    }));

    res.status(200).json({ users: transformedUsers });
  } catch (error) {
    console.error("Error fetching users with payroll:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
