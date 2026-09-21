import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  

  try {
    // Get user from token
    const cookies = cookie.parse(req.headers.get('cookie') || '');
    const { token } = cookies;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hasAccess = (await checkPermission(decoded, PERMISSION_KEYS.COMPLIANCE_VIEW_DOCUMENTS)) || (await checkPermission(decoded, PERMISSION_KEYS.COMPLIANCE_VIEW));
    
    if (!hasAccess) {
      return NextResponse.json({ message: 'Forbidden: insufficient permissions' }, { status: 403 });
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

    return NextResponse.json({ users: transformedUsers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users for document center:", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}


