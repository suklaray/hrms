import db from '@/lib/db';

export default async function handler(req, res) {
  try {
    const [rows] = await db.query('SELECT id, type_name FROM leave_types');
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
}
