import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Access denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { role, email } = decoded; // ✅ use email, not empid
    const allowedRoles = ["superadmin", "admin", "hr"];

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, message: "Missing event ID" });
    }

    const numericId = Number(id);
    const existingEvent = await prisma.calendar_events.findUnique({
      where: { id: numericId },
    });

    if (!existingEvent) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // 🛑 Restrict deletion: only superadmin or event creator can delete
    if (role !== "superadmin" && existingEvent.created_by !== email) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this event",
      });
    }

    await prisma.calendar_events.delete({
      where: { id: numericId },
    });

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
