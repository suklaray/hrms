// /pages/api/hr/leave-requests.js
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const leaveRequests = await prisma.leave_requests.findMany({
      orderBy: {
        applied_at: 'desc', 
      },
    });

    res.status(200).json({ success: true, data: leaveRequests });
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
}
