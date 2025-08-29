import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { empid } = req.query;

  if (!empid) {
    return res.status(400).json({ success: false, message: 'Employee ID is required' });
  }

  try {
    // Get employee basic info
    const employee = await prisma.users.findFirst({
      where: { empid: empid },
      select: {
        empid: true,
        name: true,
        email: true,
      }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Get all leave requests for this employee
    const leaveHistory = await prisma.leave_requests.findMany({
      where: { empid: empid },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        leave_type: true,
        from_date: true,
        to_date: true,
        reason: true,
        status: true,
        attachment: true,
      }
    });

    const employeeData = {
      ...employee,
      leaveHistory: leaveHistory
    };

    res.status(200).json({ success: true, data: employeeData });
  } catch (error) {
    console.error('Error fetching employee leave details:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}