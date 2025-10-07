import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600).toString().padStart(3, '0');
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get user from token
    const cookies = cookie.parse(req.headers.cookie || '');
    const { token } = cookies;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await prisma.users.findUnique({
      where: { empid: decoded.empid || decoded.id },
      select: { empid: true, role: true }
    });

    if (!currentUser || !['hr', 'admin', 'superadmin'].includes(currentUser.role)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Define role-based filtering
    let roleFilter = [];
    if (currentUser.role === 'hr') {
      roleFilter = ['employee'];
    } else if (currentUser.role === 'admin') {
      roleFilter = ['hr', 'employee'];
    } else if (currentUser.role === 'superadmin') {
      roleFilter = ['admin', 'hr', 'employee'];
    }

    const results = await prisma.$queryRawUnsafe(`
      SELECT 
        u.empid,
        u.name,
        u.email,
        u.role,
        (
          SELECT a2.check_in 
          FROM attendance a2 
          WHERE a2.empid = u.empid 
            AND DATE(a2.check_in) = CURRENT_DATE 
          ORDER BY a2.check_in ASC 
          LIMIT 1
        ) AS last_login,
        MAX(a.check_out) AS last_logout,
        (
          SELECT a2.check_in 
          FROM attendance a2 
          WHERE a2.empid = u.empid 
            AND DATE(a2.check_in) = CURRENT_DATE 
            AND a2.check_out IS NULL 
          ORDER BY a2.check_in DESC 
          LIMIT 1
        ) AS today_checkin,
        (
          SELECT COALESCE(SUM(
            EXTRACT(EPOCH FROM 
              COALESCE(a3.check_out, NOW()) - a3.check_in
            )
          ), 0)
          FROM attendance a3 
          WHERE a3.empid = u.empid 
            AND DATE(a3.check_in) = CURRENT_DATE
        ) AS today_total_seconds,
        (
          SELECT COALESCE(SUM(
            EXTRACT(EPOCH FROM a4.check_out - a4.check_in)
          ), 0)
          FROM attendance a4 
          WHERE a4.empid = u.empid 
            AND DATE(a4.check_in) = CURRENT_DATE
            AND a4.check_out IS NOT NULL
        ) AS today_completed_seconds,
        u.status
      FROM 
        users u
      LEFT JOIN 
        attendance a ON u.empid = a.empid
      WHERE 
        u.role IN (${roleFilter.map(role => `'${role}'`).join(', ')})
        AND u.status != 'Inactive'
      GROUP BY 
        u.empid, u.name, u.email, u.role, u.status
      ORDER BY 
        last_login DESC
    `);

    const attendanceData = results.map((user) => {
      const attendance_status = (user.today_total_seconds || 0) >= 14400 ? "Present" : "Absent";

      return {
        empid: user.empid,
        name: user.name,
        email: user.email,
        role: user.role,
        last_login: user.last_login ? user.last_login.toISOString() : null,
        last_logout: user.last_logout ? user.last_logout.toISOString() : null,
        today_checkin: user.today_checkin ? user.today_checkin.toISOString() : null,
        today_completed_seconds: user.today_completed_seconds || 0,
        today_total_seconds: user.today_total_seconds || 0,
        total_hours: formatDuration(user.today_total_seconds || 0),
        attendance_status,
        status: user.status,
      };
    });

    res.status(200).json(attendanceData);
  } catch (error) {
    console.error("Attendance API Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
