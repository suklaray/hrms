import { withSessionTimeout } from "@/lib/authMiddleware";
import prisma from "@/lib/prisma";

async function handler(req, res) {
  try {
    const decoded = req.user; // User info from middleware

    if (decoded.role !== "employee") {
      return res.status(403).json({ error: "Access denied" });
    }

    // Fetch basic employee details from `users` table
    const user = await prisma.users.findUnique({
      where: { id: decoded.id },
      select: {
        empid: true,
        name: true,
        email: true,
        role: true,
        position: true,
        profile_photo: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Check if employee has checked in today but not checked out
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findFirst({
      where: {
        empid: user.empid,
        date: {
          gte: today,
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    const isWorking = !!(attendance?.check_in && !attendance?.check_out);
    const workStartTime = attendance?.check_in || null;

    // Return user info + attendance status + JWT fields
    res.status(200).json({
      user: {
        ...user,
        isWorking,
        workStartTime,
        verified: decoded.verified,
        form_submitted: decoded.form_submitted,
      },
    });
  } catch (err) {
    console.error("Auth error in /me:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export default withSessionTimeout(handler);
