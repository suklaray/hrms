import prisma from "@/lib/prisma";
import { verifyEmployeeToken } from '@/lib/auth';

export default async function handler(req, res) {
  const user = await verifyEmployeeToken(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    // Get all leave types
    const leaveTypes = await prisma.leave_types.findMany({
      select: {
        id: true,
        type_name: true,
        max_days: true
      }
    });

    // Get approved leaves for this employee
    const approvedLeaves = await prisma.leave_requests.findMany({
      where: {
        empid: user.empid,
        status: 'Approved'
      },
      select: {
        leave_type: true,
        from_date: true,
        to_date: true
      }
    });

    // Calculate balance for each leave type
    const balances = leaveTypes.map(leaveType => {
      const displayName = leaveType.type_name.replace(/_/g, ' ');
      
      // Calculate used days for this leave type
      const usedDays = approvedLeaves
        .filter(leave => leave.leave_type === displayName)
        .reduce((total, leave) => {
          const fromDate = new Date(leave.from_date);
          const toDate = new Date(leave.to_date);
          const days = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
          return total + days;
        }, 0);

      const remaining = leaveType.max_days - usedDays;

      return {
        type_name: leaveType.type_name,
        max_days: leaveType.max_days,
        used: usedDays,
        remaining: remaining > 0 ? remaining : 0
      };
    });

    res.status(200).json(balances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}
