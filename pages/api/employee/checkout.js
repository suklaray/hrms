import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    // Verify JWT token
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'employee') {
      return res.status(403).json({ error: 'Access denied - Employee only' });
    }

    // Use empid from JWT token, not request body
    const empid = decoded.empid;

    // Proceed with checkout
    await prisma.$transaction([
      prisma.users.update({
        where: { empid },
        data: { status: "Logged Out" },
      }),
      prisma.attendance.updateMany({
        where: {
          empid,
          check_out: null,
        },
        data: {
          check_out: new Date(),
        },
      }),
    ]);

    res.status(200).json({ message: "Check-out successful" });
  } catch (err) {
    res.status(500).json({ error: "Check-out failed", details: err.message });
  }
}
