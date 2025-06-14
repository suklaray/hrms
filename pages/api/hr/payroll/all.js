import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const [rows] = await db.execute(
      `SELECT p.*, u.name, u.position  
       FROM payroll p 
       JOIN users u ON p.empid = u.empid 
       ORDER BY year DESC, month DESC`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching payrolls:', error);
    res.status(500).json({ message: 'Database error' });
  }
}
