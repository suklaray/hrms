import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { empid } = req.query;

  if (!empid) {
    return res.status(400).json({ message: 'Employee ID is required' });
  }

  try {
    const [rows] = await db.execute(
      `SELECT * FROM payroll WHERE empid = ? ORDER BY year DESC, month DESC`,
      [empid]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching employee payroll:', error);
    res.status(500).json({ message: 'Database error' });
  }
}
