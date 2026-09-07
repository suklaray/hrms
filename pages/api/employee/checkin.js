import prisma from "@/lib/prisma";
import { withSessionTimeout } from "@/lib/authMiddleware";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import { getPendingRegularization } from "@/lib/checkPendingRegularization";

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const decoded = req.user;
    const empid = decoded.empid;

    const canCheckin = await checkPermission(decoded, PERMISSION_KEYS.ATTENDANCE_MY);
    if (!canCheckin) return res.status(403).json({ error: 'Forbidden: insufficient permissions' });

    const pendingAttendance = await getPendingRegularization(empid);
    if (pendingAttendance) {
      return res.status(400).json({
        error: "Please submit yesterday's attendance regularization before checking in."
      });
    }

    await prisma.$transaction([
      prisma.users.update({ where: { empid }, data: { status: "Logged In" } }),
      prisma.attendance.create({
        data: { empid, check_in: new Date(), date: new Date(), attendance_status: "Present" },
      }),
    ]);

    res.status(200).json({ message: "Check-in successful" });
  } catch (err) {
    console.error("Check-in failed:", err);
    res.status(500).json({ error: "Check-in failed", details: err.message });
  }
}

export default withSessionTimeout(handler);
