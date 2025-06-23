import prisma from "@/lib/prisma";

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
    SUM(EXTRACT(EPOCH FROM a.check_out - a.check_in)) / 3600 AS total_hours,
    CASE 
      WHEN u.status = 'Logged In' THEN 'Logged In'
      WHEN u.status = 'Logged Out' THEN 'Logged Out'
      ELSE 'N/A'
    END AS status
  FROM 
    users u
  LEFT JOIN 
    attendance a ON u.empid = a.empid
  WHERE 
    u.role = 'employee'
  GROUP BY 
    u.empid, u.name, u.email, u.role, u.status
  ORDER BY 
    last_login DESC
`);


    const attendanceData = results.map((user) => ({
      empid: user.empid,
      name: user.name,
      email: user.email,
      role: user.role,
      last_login: user.last_login,
      last_logout: user.last_logout,
      total_hours: user.total_hours,
      status: user.status,
    }));

    res.status(200).json(attendanceData);
  } catch (error) {
    console.error("Error fetching attendance data:", error);
    res.status(500).json({ error: "Server error" });
  }
}
