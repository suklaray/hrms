import prisma from "@/lib/prisma";
import bcrypt from 'bcryptjs';


export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    empid, name, email, password, position,
    date_of_joining, experience, profile_photo, role
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.users.create({
      data: {
        empid,
        name,
        email,
        password: hashedPassword,
        position,
        date_of_joining: new Date(date_of_joining),
        status: 'Active',
        experience: experience || null,
        profile_photo: profile_photo || null,
        role,
        verified: 'verified'
      }
    });

    res.status(200).json({ message: 'Employee created successfully' });
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Database insert failed' });
  }
}
