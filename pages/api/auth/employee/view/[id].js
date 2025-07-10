import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const employee = await prisma.employees.findUnique({
      where: { email: user.email },
    });

    let addresses = [];
    let bankDetails = [];

    if (employee) {
      addresses = await prisma.addresses.findMany({
        where: { employee_id: employee.empid },
      });

      bankDetails = await prisma.bank_details.findMany({
        where: { employee_id: employee.empid },
      });
    }

    return res.status(200).json({
      user,
      employee: employee || null,
      addresses,
      bankDetails,
    });

  } catch (error) {
    console.error("Error in employee view API:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
}
