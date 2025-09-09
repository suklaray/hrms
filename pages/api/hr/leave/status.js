import prisma from "@/lib/prisma";
import jwt from 'jsonwebtoken';
import cookie from 'cookie';

export default async function handler(req, res) {
  let token = null;

  if (req.headers.cookie) {
    const parsed = cookie.parse(req.headers.cookie);
    token = parsed.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const rows = await prisma.leave_requests.findMany({
      where: { empid: user.empid },
      select: {
        id: true,
        leave_type: true,
        from_date: true,
        to_date: true,
        status: true,
        reason: true,
        attachment: true,
        applied_at: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}