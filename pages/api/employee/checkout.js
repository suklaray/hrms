import prisma from "@/lib/prisma";
import { withSessionTimeout } from "@/lib/authMiddleware";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const decoded = req.user;
    const empid = decoded.empid;

    const canCheckout = await checkPermission(decoded, PERMISSION_KEYS.ATTENDANCE_MY);
    if (!canCheckout) return res.status(403).json({ error: 'Forbidden: insufficient permissions' });

    const checkoutTime = new Date();
    const latestCheckin = await prisma.attendance.findFirst({
      where: { empid, check_out: null },
      orderBy: { check_in: 'desc' }
    });

    if (!latestCheckin) {
      return res.status(400).json({ error: "No active check-in found" });
    }

    const totalHours = (checkoutTime - new Date(latestCheckin.check_in)) / (1000 * 60 * 60);
    const attendanceStatus = totalHours >= 4 ? "Present" : "Absent";

    await prisma.$transaction([
      prisma.users.update({ where: { empid }, data: { status: "Logged Out" } }),
      prisma.attendance.update({
        where: { id: latestCheckin.id },
        data: { check_out: checkoutTime, total_hours: totalHours, attendance_status: attendanceStatus },
      }),
    ]);

    res.status(200).json({ message: "Check-out successful" });
  } catch (err) {
    res.status(500).json({ error: "Check-out failed", details: err.message });
  }
}

export default withSessionTimeout(handler);
