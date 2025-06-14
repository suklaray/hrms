import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    empid, name, email, password, position,
    date_of_joining, experience, profile_photo, role
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO users (empid, name, email, password, position, date_of_joining, status, experience, profile_photo, role, verified)
       VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, 'verified')`,
      [
        empid,
        name,
        email,
        hashedPassword,
        position,
        date_of_joining,
        experience || null,
        profile_photo || null,
        role,
      ]
    );

    res.status(200).json({ message: 'Employee created successfully' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Database insert failed' });
  }
}
