import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const token = req?.cookies?.token;
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).json({ success: false, message: 'Invalid token' }); }
  const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_GENERATE);
  if (!hasAccess) return res.status(403).json({ success: false, message: 'Forbidden: insufficient permissions' });

  try {
    const configurations = await prisma.PayrollConfiguration.findMany({
      include: {
        company: true,
      },
    });
    return res.status(200).json({ success: true, data: configurations });
  } catch (error) {
    console.error('Error fetching configurations:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}