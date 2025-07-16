// pages/api/auth/employee/emp-payslip.js
import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from "@/lib/auth"; // assuming you're using this

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  try {
    const user = await verifyEmployeeToken(req); // get logged-in user from JWT

    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const payslips = await prisma.payroll.findMany({
      where: { empid: user.empid },
      orderBy: { generated_on: "desc" },
      select: {
        id: true,
        month: true,
        year: true,
        payslip_pdf: true,
      },
    });

    res.status(200).json({ documents: payslips });
  } catch (err) {
    console.error("Payslip fetch error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
