// /pages/api/hr/employees.js
import db from '@/lib/db'; 

export default async function handler(req, res) {
  // Check for the correct HTTP method (GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Query to fetch employee data from the database
    const [rows] = await db.query(`
      SELECT empid, name, email, contact_number AS phone
      FROM users
      WHERE role = 'employee'
    `);

    // Return the result as an array of employees
    return res.status(200).json({ employees: rows });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
