import db from '@/lib/db';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const [rows] = await db.query('SELECT name, email FROM candidates WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Candidate not found' });

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Error fetching candidate:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
