// pages/api/leave/status.js
import db from '../../../lib/db';

export default async function handler(req, res) {
  const { empid } = req.query;

  try {
    const [rows] = await db.execute('SELECT leave_type, from_date, to_date, status FROM leave_requests WHERE empid = ?', [empid]);
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}
