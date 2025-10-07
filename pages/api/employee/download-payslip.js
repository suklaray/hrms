import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await verifyEmployeeToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year required' });
    }

    // Get employee details
    const employee = await prisma.users.findUnique({
      where: { empid: user.empid },
      select: { empid: true, name: true, email: true, role: true, position: true },
    });

    const employeeData = await prisma.employees.findFirst({
      where: { email: employee.email },
      select: { contact_no: true },
    });

    // Get payroll data
    const payslip = await prisma.payroll.findFirst({
      where: { empid: user.empid, month, year: parseInt(year) },
    });

    if (!payslip) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    // Generate HTML content for PDF
    const htmlContent = generatePayslipHTML(employee, employeeData, payslip, month, year);
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip-${user.empid}-${month}-${year}.pdf"`);
    
    // For now, return the HTML (you'll need to implement PDF generation)
    res.status(200).send(htmlContent);
    
  } catch (error) {
    console.error('Error generating payslip:', error);
    res.status(500).json({ message: 'Server error' });
  }
}

function generatePayslipHTML(employee, employeeData, payslip, month, year) {
  return `<!DOCTYPE html><html><head><title>Payslip</title></head><body><h1>Payslip for ${employee.name}</h1><p>Month: ${month} ${year}</p></body></html>`;
}
