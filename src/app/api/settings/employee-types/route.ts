import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { getAssignableRolesForUser, ensureSuperAdminRole, checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;

  const canManageEmployeeTypes = await checkPermission(
    user,
    PERMISSION_KEYS.SETTINGS_EMPLOYEE_TYPES_MANAGE
  );
  const canManageEmployees =
    (await checkPermission(user, PERMISSION_KEYS.EMPLOYEE_CREATE)) ||
    (await checkPermission(user, PERMISSION_KEYS.EMPLOYEE_EDIT));

  if (!canManageEmployeeTypes && !canManageEmployees) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  if (!canManageEmployeeTypes) {
    const assignableRoles = await getAssignableRolesForUser(user);
    return NextResponse.json(
      { roles: assignableRoles, assignableRoles },
      { status: 200 }
    );
  }

  const roles = await prisma.role.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });

  const assignableRoles = await getAssignableRolesForUser(user);

  return NextResponse.json({ roles, assignableRoles }, { status: 200 });
}

export async function POST(req: NextRequest, context?: { params?: Promise<any> }) {
  const { user, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.SETTINGS_EMPLOYEE_TYPES_MANAGE);
  if (!hasAccess) {
    return NextResponse.json({ error: "Insufficient permissions to manage employee types" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { name, description, status = "active", parentId, permissionIds = [] } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Employee type name is required" }, { status: 400 });
  }

  const existing = await prisma.role.findUnique({ where: { name: name.trim() } });
  if (existing) {
    return NextResponse.json({ error: "An employee type with this name already exists" }, { status: 400 });
  }

  let resolvedParentId = parentId ? parseInt(parentId, 10) : null;
  if (!resolvedParentId) {
    const superAdminRole = await ensureSuperAdminRole(prisma);
    if (superAdminRole && superAdminRole.name !== name.trim()) {
      resolvedParentId = superAdminRole.id;
    }
  }

  const normalizedStatus =
    String(status).toUpperCase() === "INACTIVE"
      ? "INACTIVE"
      : String(status).toUpperCase() === "ARCHIVED"
      ? "ARCHIVED"
      : "ACTIVE";

  const role = await prisma.role.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      status: normalizedStatus as any,
      type: "CUSTOM",
      parentId: resolvedParentId,
      permissions: {
        create: permissionIds.map((id: number) => ({ permissionId: id })),
      },
    },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json({ role }, { status: 201 });
}
