// pages/api/employee/profile.js
import jwt from 'jsonwebtoken';
import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const [rows] = await db.query('SELECT empid, name, email, contact_no, profile_photo FROM users WHERE empid = ?', [empid]);
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}
