import { createRouteHandler } from "@/lib/apiAdapter";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const token = req?.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).json({ message: 'Invalid token' }); }
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_GENERATE);
    if (!hasAccess) return res.status(403).json({ message: 'Forbidden: insufficient permissions' });

    try {
        const companies = await prisma.company.findMany();
        return res.status(200).json({ data: companies });
    } catch (error) {
        console.error('Error fetching companies:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const { GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS } = createRouteHandler(handler);
