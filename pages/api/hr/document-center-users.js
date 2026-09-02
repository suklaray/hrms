import jwt from "jsonwebtoken";
import cookie from "cookie";
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

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
    const hasAccess = (await checkPermission(decoded, PERMISSION_KEYS.COMPLIANCE_VIEW_DOCUMENTS)) || (await checkPermission(decoded, PERMISSION_KEYS.COMPLIANCE_VIEW));
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }

    const users = await prisma.users.findMany({
      where: {
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
