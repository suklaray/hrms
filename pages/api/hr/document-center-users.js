// /pages/api/hr/document-center-users.js
import jwt from "jsonwebtoken";
import cookie from "cookie";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
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

    const users = await prisma.users.findMany({
      where: {
        role: { in: roleFilter },
        status: { not: 'Inactive' }
      },
      select: {
        empid: true,
        name: true,
        email: true,
        contact_number: true,
        role: true,
        position: true,
        date_of_joining: true,
        status: true,
      },
    });

    const transformedUsers = users.map((user) => ({
      empid: user.empid,
      name: user.name,
      email: user.email,
      phone: user.contact_number,
      role: user.role,
      position: user.position || null,
      date_of_joining: user.date_of_joining || null,
      status: user.status || "Active",
    }));

    res.status(200).json({ users: transformedUsers });
  } catch (error) {
    console.error("Error fetching users for document center:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
