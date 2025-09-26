import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { empid, month, year } = req.query;
    
    // Use empid from URL parameter (for the specific payslip being viewed)
    const payslip = await prisma.payroll.findFirst({
      where: { empid: empid, month, year: parseInt(year) }
    });
    
    if (!payslip) return res.status(404).json({ error: "Payslip not found" });
    res.json(payslip);
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
}
