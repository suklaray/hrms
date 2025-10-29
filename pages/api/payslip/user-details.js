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
    const { empid } = req.query;
    
    // Use empid from URL parameter
    const user = await prisma.users.findUnique({
      where: { empid: empid },
      select: { empid: true, name: true, email: true, role: true, contact_number: true, position: true, candidate_id: true }
    });
    
    if (!user) return res.status(404).json({ error: "User not found" });

    let bankDetails = null;
    let employeeContact = null;

    // Try to find bank details using empid directly first
    const directBankDetails = await prisma.bank_details.findFirst({
      where: { employee_id: empid }
    });
    
    if (directBankDetails) {
      bankDetails = directBankDetails;
    }

    // If no direct bank details and candidate_id exists, try the candidate route
    if (!bankDetails && user.candidate_id) {
      const employeeRecord = await prisma.employees.findFirst({
        where: { candidate_id: user.candidate_id },
      });
      
      if (employeeRecord) {
        employeeContact = employeeRecord.contact_no;
        
        const bankDetailsRecord = await prisma.bank_details.findFirst({
          where: { employee_id: employeeRecord.empid }
        });
        
        if (bankDetailsRecord) {
          bankDetails = bankDetailsRecord;
        }
      }
    }

    const finalContact = user.contact_number || employeeContact || 'Not provided';

    const employee = {
      ...user,
      contact_number: finalContact,
      contact_no: finalContact,
      bankDetails: bankDetails,
    };

    res.json(employee);
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
}
