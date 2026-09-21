import { getRequestBody } from "@/lib/routeHelper";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { isSuperAdmin, getAssignableRolesForUser, checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const body = (await getRequestBody(req)) || {};

  try {
    // Get user from token
    const cookies = cookie.parse(req.headers.get('cookie') || '');
    const { token } = cookies;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const hasAccess = await checkPermission(decoded, PERMISSION_KEYS.EMPLOYEE_CREATE);
    if (!hasAccess) {
      return NextResponse.json({ message: 'Forbidden: insufficient permissions' }, { status: 403 });
    }
    const currentUser = decoded;

    const {
      name,
      email,
      contact_number,
      position,
      date_of_joining,
      status,
      experience,
      employee_type,
      role = "employee",
      rbacRoleId = null,
    } = body;

    if (!name || !email || !employee_type) {
      return NextResponse.json({
        success: false,
        message: "Name, email, and employee type are required.",
      }, { status: 400 });
    }

    // Dynamic DB role-hierarchy validation
    const assignableRoles = await getAssignableRolesForUser(currentUser);
    const assignableIds = new Set(assignableRoles.map((r) => r.id));

    let parsedRbacRoleId: number | null = null;
    let assignedLegacyRole: any = "employee";

    if (rbacRoleId) {
      parsedRbacRoleId = parseInt(rbacRoleId, 10);
      if (!isSuperAdmin(currentUser) && !assignableIds.has(parsedRbacRoleId)) {
        return NextResponse.json({
          success: false,
          message: `You are not authorized to assign this role.`
        }, { status: 403 });
      }

      const roleRecord = await prisma.role.findUnique({
        where: { id: parsedRbacRoleId },
        select: { name: true }
      });
      if (roleRecord) {
        const lowerName = roleRecord.name.toLowerCase().replace(/\s+/g, '');
        const knownEnums: Record<string, any> = {
          superadmin: "superadmin",
          admin: "admin",
          hr: "hr",
          ceo: "ceo",
          employee: "employee"
        };
        assignedLegacyRole = knownEnums[lowerName] || "employee";
      }
    } else if (role && typeof role === 'string') {
      const lowerName = role.toLowerCase().replace(/\s+/g, '');
      const knownEnums: Record<string, any> = {
        superadmin: "superadmin",
        admin: "admin",
        hr: "hr",
        ceo: "ceo",
        employee: "employee"
      };
      assignedLegacyRole = knownEnums[lowerName] || "employee";
    }

    // Generate candidate ID using standard logic
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const datePrefix = `${year}${month}${day}`;
    const empid = `${name.substring(0, 2).toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`;
    const rawPassword = uuidv4().slice(0, 8); // Secure 8-char password
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Find the highest candidate ID across candidates and employees tables
    const [lastCandidate, lastEmployee] = await Promise.all([
      prisma.candidates.findFirst({
        orderBy: { candidate_id: "desc" },
      }),
      prisma.employees.findFirst({
        where: { candidate_id: { not: null } },
        orderBy: { candidate_id: "desc" },
      })
    ]);

    let nextSerial = 1;
    const candidateSerial = lastCandidate ? parseInt(lastCandidate.candidate_id.slice(-6)) : 0;
    const employeeSerial = lastEmployee?.candidate_id ? parseInt(lastEmployee.candidate_id.slice(-6)) : 0;
    const maxSerial = Math.max(candidateSerial, employeeSerial);
    if (maxSerial > 0) {
      nextSerial = maxSerial + 1;
    }

    const serialStr = String(nextSerial).padStart(6, "0");
    const candidateId = `${datePrefix}${serialStr}`;

    // Double-check for uniqueness
    const [existingCandidate, existingEmployee] = await Promise.all([
      prisma.candidates.findFirst({ where: { candidate_id: candidateId } }),
      prisma.employees.findFirst({ where: { candidate_id: candidateId } })
    ]);

    if (existingCandidate || existingEmployee) {
      return NextResponse.json({ error: "ID generation conflict. Please try again." }, { status: 500 });
    }

    await prisma.users.create({
      data: {
        empid,
        name,
        email,
        contact_number: contact_number || null,
        password: hashedPassword,
        position: position || null,
        date_of_joining: date_of_joining ? new Date(date_of_joining) : null,
        status: status || "Active",
        experience: experience ? parseInt(experience) : null,
        role: assignedLegacyRole,
        employee_type,
        candidate_id: candidateId,
        roleId: parsedRbacRoleId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Employee registered successfully with ID ${empid}`,
      empid,
      password: rawPassword, // Only sent once
    }, { status: 201 });

  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({
      success: false,
      message: "Server error. Please try again later.",
    }, { status: 500 });
  }
}
