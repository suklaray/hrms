// /pages/api/hr/users.js
import prisma from "@/lib/prisma";
import { withSessionTimeout } from "@/lib/authMiddleware";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const hasAccess = (await checkPermission(user, PERMISSION_KEYS.EMPLOYEE_VIEW)) || (await checkPermission(user, PERMISSION_KEYS.PAYROLL_VIEW));
  if (!hasAccess) {
    return res.status(403).json({ message: "Access denied: insufficient permissions" });
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const users = await prisma.users.findMany({
      select: {
        empid: true,
        name: true,
        email: true,
        contact_number: true,
        role: true,
        payroll: {
          where: {
            generated_on: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          select: {
            id: true, 
          },
        },
      },
    });

    const transformedUsers = users.map((user) => ({
      empid: user.empid,
      name: user.name,
      email: user.email,
      phone: user.contact_number,
      role: user.role,
      payrollStatus: user.payroll.length > 0 ? "Generated" : "Pending",
    }));

    res.status(200).json({ users: transformedUsers });
  } catch (error) {
    console.error("Error fetching users with payroll:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export default withSessionTimeout(handler);
