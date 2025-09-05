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
    
    // Allow all authenticated users to check in

    // Use empid from JWT token, not request body
    const empid = decoded.empid;

    // Proceed with checkin
    // Use Prisma transaction to ensure both actions succeed together
    await prisma.$transaction([
      prisma.users.update({
        where: { empid },
        data: { status: "Logged In" },
      }),
      prisma.attendance.create({
        data: {
          empid,
          check_in: new Date(),
          date: new Date(),
          attendance_status: "Present"
        },
      }),
    ]);

    res.status(200).json({ message: "Check-in successful" });
  } catch (err) {
    console.error("Check-in failed:", err);
    res.status(500).json({ error: "Check-in failed", details: err.message });
  }
}
