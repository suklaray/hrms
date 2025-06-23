// pages/api/employee/profile.js
import jwt from 'jsonwebtoken';
import prisma from "@/lib/prisma";


export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        empid: true,
        name: true,
        email: true,
        contact_number: true,
        profile_photo: true,
      },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
}
