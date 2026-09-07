import prisma from "@/lib/prisma";
import { withSessionTimeout } from "@/lib/authMiddleware";
import { checkPermission, isSuperAdmin } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const decoded = req.user;

    const canView = await checkPermission(decoded, PERMISSION_KEYS.CALENDAR_MANAGE);
    if (!canView) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    const { id, title, description, event_date, event_type, visible_to } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "Missing event ID" });
    }

    // Fetch existing event
    const existingEvent = await prisma.calendar_events.findUnique({
      where: { id: Number(id) },
    });

    if (!existingEvent) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // 🧠 Role-based restriction
    if (!isSuperAdmin(decoded) && existingEvent.created_by !== decoded.email) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to edit this event",
      });
    }

    //  Merge visibility:
    // 1. Start with previous visible_to list
    // 2. Merge any new values user passed
    // 3. Always include the creator’s (or updater’s) email
    const newVisibleTo = visible_to
      ? visible_to.split(",").map(e => e.trim()).filter(e => e)
      : [];

    // Always include updater's email unless "all" is selected
    const updatedVisibleTo = newVisibleTo.includes('all') 
      ? 'all'
      : Array.from(new Set([...newVisibleTo, email])).join(",");

    const updatedEvent = await prisma.calendar_events.update({
      where: { id: Number(id) },
      data: {
        title,
        description,
        event_date: new Date(event_date),
        event_type,
        visible_to: updatedVisibleTo,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
export default withSessionTimeout(handler);