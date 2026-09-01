// /pages/api/auth/employee/update-role/[id].js
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { isSuperAdmin, getAssignableRolesForUser } from "@/lib/rbac";

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  let decoded;
  try {
    // Check authentication
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Access denied" });
    }

    decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !['admin', 'hr', 'superadmin'].includes(decoded.role?.toLowerCase())) {
      return res.status(403).json({ message: "Access denied" });
    }
  } catch (authError) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { role, roleId } = req.body;

  try {
    const assignableRoles = await getAssignableRolesForUser(decoded);
    const assignableIds = new Set(assignableRoles.map((r) => r.id));

    const updateData = {};
    if (roleId !== undefined && roleId !== null) {
      const parsedRoleId = parseInt(roleId, 10);
      if (!isNaN(parsedRoleId)) {
        if (!isSuperAdmin(decoded) && !assignableIds.has(parsedRoleId)) {
          return res.status(403).json({ message: "Forbidden: You can only assign lower roles under your hierarchy." });
        }
        updateData.roleId = parsedRoleId;
      }
    }
    if (role && ["admin", "hr", "employee", "superadmin"].includes(role)) {
      updateData.role = role;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "Invalid or missing role or roleId" });
    }

    const updatedUser = await prisma.users.update({
      where: { empid: id },
      data: updateData,
      include: {
        rbacRole: true,
      },
    });

    return res.status(200).json({ message: "Role updated successfully", updatedUser });
  } catch (error) {
    console.error("Error updating role:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}
