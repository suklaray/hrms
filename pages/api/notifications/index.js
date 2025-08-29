import prisma from "@/lib/prisma";
import { getUserFromToken } from "@/lib/getUserFromToken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const user = getUserFromToken(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  try {
    const notifications = [];

    // Check for new attendance requests (manual attendance)
    const pendingAttendance = await prisma.attendance.count({
      where: {
        attendance_status: 'Absent',
        date: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7))
        }
      }
    });

    if (pendingAttendance > 0) {
      notifications.push({
        id: 'attendance-' + Date.now(),
        type: 'attendance',
        title: 'New Attendance Requests',
        message: `${pendingAttendance} pending attendance requests`,
        link: '/attendance/manual',
        createdAt: new Date(),
        viewed: false
      });
    }

    // Check for new customer connect messages
    const newMessages = await prisma.contact_submissions.count({
      where: {
        created_at: {
          gte: new Date(new Date().setDate(new Date().getDate() - 1))
        }
      }
    });

    if (newMessages > 0) {
      notifications.push({
        id: 'contact-' + Date.now(),
        type: 'contact',
        title: 'New Customer Messages',
        message: `${newMessages} new customer contact messages`,
        link: '/customer-connect',
        createdAt: new Date(),
        viewed: false
      });
    }

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}