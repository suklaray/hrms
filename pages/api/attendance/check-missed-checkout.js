import { withSessionTimeout } from '@/lib/authMiddleware';
import { getPendingRegularization } from '@/lib/checkPendingRegularization';
import { withPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = req.user;
    const pendingAttendance = await getPendingRegularization(user.empid);

    if (!pendingAttendance) {
      return res.status(200).json({
        hasMissedCheckout: false,
      });
    }

    return res.status(200).json({
      hasMissedCheckout: true,
      attendance: {
        id: pendingAttendance.id,
        date: pendingAttendance.date,
        check_in: pendingAttendance.check_in,
      },
    });
  } catch (err) {
    console.error('Check missed checkout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
export default withSessionTimeout(withPermission(PERMISSION_KEYS.ATTENDANCE_REGULARIZE, handler));
