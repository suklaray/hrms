import { verifyEmployeeToken } from '@/lib/auth';
import { verifyHRToken } from '@/lib/auth-hr';
import prisma from '@/lib/prisma';

const isValidCheckout = (dt) => {
  if (!dt) return false;
  const d = new Date(dt);
  return !isNaN(d.getTime()) && d.getFullYear() > 1971;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = (await verifyEmployeeToken(req)) || (await verifyHRToken(req));
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch holidays to exclude
    const holidays = await prisma.calendar_events.findMany({
      where: { event_type: 'holiday' },
      select: { event_date: true }
    });
    const holidaySet = new Set(holidays.map(h => new Date(h.event_date).toISOString().split('T')[0]));

    const isWorkingDay = (date) => {
      const day = date.getDay(); // 0=Sun, 6=Sat
      if (day === 0 || day === 6) return false;
      return !holidaySet.has(date.toISOString().split('T')[0]);
    };

    // Find most recent past attendance with a missed checkout on a working day
    const candidates = await prisma.attendance.findMany({
      where: {
        empid: user.empid,
        check_in: { not: null },
        date: { lt: today }
      },
      orderBy: { date: 'desc' }
    });

    const missedCheckout = candidates.find(r =>
      !isValidCheckout(r.check_out) && r.date && isWorkingDay(new Date(r.date))
    ) || null;

    if (!missedCheckout) {
      return res.status(200).json({ hasMissedCheckout: false });
    }

    // Check if regularization already exists for this attendance
    const existingRequest = await prisma.attendance_regularization.findFirst({
      where: { attendance_id: missedCheckout.id }
    });

    if (existingRequest) {
      return res.status(200).json({ hasMissedCheckout: false });
    }

    return res.status(200).json({
      hasMissedCheckout: true,
      attendance: {
        id: missedCheckout.id,
        date: missedCheckout.date,
        check_in: missedCheckout.check_in
      }
    });

  } catch (err) {
    console.error('Check missed checkout error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
