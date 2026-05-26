import prisma from "@/lib/prisma";
import { getUserFromToken } from '@/lib/getUserFromToken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Get token from cookies
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - No token provided' });
  }

  // Verify HR/Admin user
  const user = getUserFromToken(token);
  if (!user || !['hr', 'admin', 'superadmin'].includes(user.role)) {
    return res.status(401).json({ message: 'Unauthorized - Insufficient permissions' });
  }

  const { leaveId } = req.body;

  if (!leaveId) {
    return res.status(400).json({ message: 'Leave ID is required' });
  }

  try {
    // First, get the leave request to check if it can be cancelled
    const leaveRequest = await prisma.leave_requests.findFirst({
      where: {
        id: parseInt(leaveId)
      }
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Check if leave can be cancelled (only pending leaves that haven't started)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const leaveStartDate = new Date(leaveRequest.from_date);
    leaveStartDate.setHours(0, 0, 0, 0);

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({ 
        message: `Cannot cancel ${leaveRequest.status.toLowerCase()} leave request` 
      });
    }

    if (leaveStartDate <= today) {
      return res.status(400).json({ 
        message: 'Cannot cancel leave request as the leave date has already started or passed' 
      });
    }

    // Update the leave request status to Cancelled
    await prisma.leave_requests.update({
      where: { id: parseInt(leaveId) },
      data: { status: 'Cancelled' }
    });

    res.status(200).json({ message: 'Leave request cancelled successfully' });
  } catch (err) {
    console.error('Error cancelling leave request:', err);
    res.status(500).json({ message: 'Server error' });
  }
}