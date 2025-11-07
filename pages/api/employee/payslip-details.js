import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const user = await verifyEmployeeToken(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const employee = await prisma.users.findUnique({
      where: { empid: user.empid },
      select: {
        empid: true,
        name: true,
        email: true,
        role: true,
        position: true,
      },
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Find employee record using main_employee_id matching users.empid
    const employeeRecord = await prisma.employees.findFirst({
      where: { main_employee_id: employee.empid },
    });

    let bankDetails = null;
    if (employeeRecord) {
      bankDetails = await prisma.bank_details.findFirst({
        where: { employee_id: employeeRecord.empid }
      });
    }

    const result = {
      ...employee,
      contact_number: employeeRecord?.contact_no || null,
      bankDetails: bankDetails
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching employee details:', error);
    res.status(500).json({ message: 'Database error' });
  }
}
