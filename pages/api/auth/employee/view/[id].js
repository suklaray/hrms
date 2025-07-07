import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Step 1: Get user by id
    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Step 2: Get employee by email
    const employee = await prisma.employees.findUnique({
      where: { email: user.email },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Step 3: Get addresses by empid
    const addresses = await prisma.addresses.findMany({
      where: { employee_id: employee.empid },
    });

    // Step 4: Get bank details by empid
    const bankDetails = await prisma.bank_details.findMany({
      where: { employee_id: employee.empid },
    });

    return res.status(200).json({
      user,
      employee,
      addresses,
      bankDetails,
    });

  } catch (error) {
    console.error("Error fetching details:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
}
