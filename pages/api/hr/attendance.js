import prisma from "@/lib/prisma";

const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
};

export default async function handler(req, res) {
  try {
    const results = await prisma.$queryRawUnsafe(`
      SELECT 
        u.empid,
        u.name,
        u.email,
        u.role,
        MAX(a.check_in) AS last_login,
        MAX(a.check_out) AS last_logout,
        DATE(MAX(a.check_in)) AS attendance_date,
        SUM(
          EXTRACT(EPOCH FROM 
            COALESCE(a.check_out, NOW()) - a.check_in
          )
        ) AS total_seconds,
        u.status
      FROM 
        users u
      LEFT JOIN 
        attendance a ON u.empid = a.empid
      WHERE 
        u.role IN ('employee', 'admin', 'hr', 'superadmin')
      GROUP BY 
        u.empid, u.name, u.email, u.role, u.status
      ORDER BY 
        last_login DESC
    `);

    const attendanceData = results.map((user) => {
      const attendance_status = (user.total_seconds || 0) >= 14400 ? "Present" : "Absent";

      return {
        empid: user.empid,
        name: user.name,
        email: user.email,
        role: user.role,
        date: user.attendance_date ? new Date(user.attendance_date).toLocaleDateString() : "N/A",
        last_login: user.last_login ? new Date(user.last_login).toLocaleString() : "N/A",
        last_logout: user.last_logout ? new Date(user.last_logout).toLocaleString() : "--",
        total_hours: formatDuration(user.total_seconds || 0),
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
