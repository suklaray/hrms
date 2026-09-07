import prisma from "@/lib/prisma";
import { withSessionTimeout } from "@/lib/authMiddleware";
import { checkPermission, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const decoded = req.user;

    const canView = await checkPermission(decoded, PERMISSION_KEYS.CALENDAR_MANAGE);
    if (!canView) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
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
    if (isSuperAdmin(decoded) && existingEvent.created_by !== decoded.email) {
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
export default withSessionTimeout(handler);