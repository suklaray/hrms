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

    const employeeData = await prisma.employees.findFirst({
      where: { email: employee.email },
      select: { contact_no: true },
    });

    const result = {
      ...employee,
      contact_number: employeeData?.contact_no || null,
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching employee details:', error);
    res.status(500).json({ message: 'Database error' });
  }
}