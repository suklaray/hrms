import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
    

    const token = req.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); } catch { return NextResponse.json({ message: 'Invalid token' }, { status: 401 }); }
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.PAYROLL_GENERATE);
    if (!hasAccess) return NextResponse.json({ message: 'Forbidden: insufficient permissions' }, { status: 403 });

    try {
        const companies = await prisma.company.findMany();
        return NextResponse.json({ data: companies }, { status: 200 });
    } catch (error) {
        console.error('Error fetching companies:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

