import prisma from "@/lib/prisma";
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!['hr', 'admin', 'superadmin'].includes(decoded.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { type_name, max_days, paid } = req.body;
    
    await prisma.leave_types.upsert({
      where: { type_name },
      update: { max_days, paid },
      create: { type_name, max_days, paid },
    });

    res.status(200).json({ message: 'Leave type configured successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
}