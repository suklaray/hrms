import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(403).json({ message: "Invalid token" });
    }

    if (req.method === "GET") {
      // Fetch leave requests for the current user
      const leaveRequests = await prisma.leave_requests.findMany({
        where: { empid: decoded.empid || decoded.id },
        orderBy: { applied_at: 'desc' },
        select: {
          id: true,
          from_date: true,
          to_date: true,
          reason: true,
          leave_type: true,
          status: true,
          applied_at: true,
          attachment: true
        }
      });

      return res.status(200).json({
        success: true,
        leaveRequests
      });
    }

    if (req.method === "POST") {
      // Submit new leave request
      const { from_date, to_date, reason, leave_type, attachment } = req.body;

      if (!from_date || !to_date || !reason || !leave_type) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get user details
      const user = await prisma.users.findUnique({
        where: { empid: decoded.empid || decoded.id },
        select: { name: true, empid: true }
      });

      const leaveRequest = await prisma.leave_requests.create({
        data: {
          empid: decoded.empid || decoded.id,
          name: user.name,
          from_date: new Date(from_date),
          to_date: new Date(to_date),
          reason,
          leave_type,
          attachment: attachment || null,
          status: "Pending"
        }
      });

      return res.status(201).json({
        success: true,
        message: "Leave request submitted successfully",
        leaveRequest
      });
    }

    return res.status(405).json({ message: "Method not allowed" });

  } catch (error) {
    console.error("Leave request API error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error"
    });
  }
}
