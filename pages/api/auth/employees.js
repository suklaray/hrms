import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

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
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.EMPLOYEE_VIEW);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }

    const { role } = req.query;

    const filters = {
      status: { not: "Inactive" },
    };

    if (role && typeof role === "string" && role !== "All") {
      filters.role = role.toLowerCase();
    }

    const users = await prisma.users.findMany({
      where: filters,
      select: {
        id: true,
        empid: true,
        name: true,
        email: true,
        contact_number: true,
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
