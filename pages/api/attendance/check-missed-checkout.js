import { verifyEmployeeToken } from '@/lib/auth';
import { verifyHRToken } from '@/lib/auth-hr';
import {getPendingRegularization} from '@/lib/checkPendingRegularization';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = (await verifyEmployeeToken(req)) || (await verifyHRToken(req));
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
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