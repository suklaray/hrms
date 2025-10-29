import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!['admin', 'hr', 'superadmin'].includes(decoded.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { empid, month, year } = req.query;

    if (!empid || !month || !year) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Get month number from month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNumber = monthNames.indexOf(month) + 1;

    if (monthNumber === 0) {
      return res.status(400).json({ message: 'Invalid month' });
    }

    // Get start and end dates for the month
    const startDate = new Date(parseInt(year), monthNumber - 1, 1);
    const endDate = new Date(parseInt(year), monthNumber, 0);

    // Fetch leave requests for the employee in the specified month
    const leaves = await prisma.leave_requests.findMany({
      where: {
        empid: empid,
        OR: [
          {
            from_date: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            to_date: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            AND: [
              { from_date: { lte: startDate } },
              { to_date: { gte: endDate } }
            ]
          }
        ]
      },
      orderBy: {
        from_date: 'desc'
      }
    });

    // Categorize leaves
    const approvedLeaves = leaves.filter(leave => leave.status === 'Approved');
    const paidLeaves = approvedLeaves.filter(leave => leave.leave_type !== 'Unpaid Leave');
    const unpaidLeaves = approvedLeaves.filter(leave => leave.leave_type === 'Unpaid Leave');

    res.status(200).json({
      approved: {
        count: approvedLeaves.length,
        leaves: approvedLeaves
      },
      paid: {
        count: paidLeaves.length,
        leaves: paidLeaves
      },
      unpaid: {
        count: unpaidLeaves.length,
        leaves: unpaidLeaves
      }
    });

  } catch (error) {
    console.error('Error fetching monthly leaves:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}