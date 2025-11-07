// /pages/api/hr/leave-requests.js
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get user from token
    const cookies = cookie.parse(req.headers.cookie || '');
    const { token } = cookies;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: { empid: true, role: true }
    });

    if (!currentUser || !['hr', 'admin', 'superadmin'].includes(currentUser.role)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Define role-based filtering
    let roleFilter = [];
    if (currentUser.role === 'hr') {
      roleFilter = ['employee'];
    } else if (currentUser.role === 'admin') {
      roleFilter = ['hr', 'employee'];
    } else if (currentUser.role === 'superadmin') {
      roleFilter = ['admin', 'hr', 'employee'];
    }

    const leaveRequests = await prisma.leave_requests.findMany({
      include: {
        users: {
          select: {
            status: true,
            role: true,
            email: true 
          }
        }
      },
      orderBy: {
        applied_at: 'desc', 
      },
    });

    // Filter based on role and active status
    const filteredLeaveRequests = leaveRequests.filter(req => 
      req.users.status !== 'Inactive' && roleFilter.includes(req.users.role)
    );

    res.status(200).json({ success: true, data: filteredLeaveRequests });
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
}
