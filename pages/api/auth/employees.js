// pages/api/auth/employees.js

import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
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

    const { role } = req.query;

    const filters = {
      status: { not: "Inactive" },
      role: { in: roleFilter }
    };

    // If role is given in query string and it's allowed for this user
    if (role && typeof role === "string" && role !== "All" && roleFilter.includes(role.toLowerCase())) {
      filters.role = role.toLowerCase();
    }

    const users = await prisma.users.findMany({
      where: filters,
      select: {
        id: true,
        empid: true,
        name: true,
        email: true,
        position: true,
        experience: true,
        role: true,
        employee_type: true,
        date_of_joining: true,
        status: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
    });
  }
}
