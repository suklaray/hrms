import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/authMiddleware";
import { ensureSuperAdminRole, checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context?: { params?: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;

  const hasAccess =
    (await checkPermission(user, PERMISSION_KEYS.SETTINGS_ROLE_VIEW)) ||
    (await checkPermission(user, PERMISSION_KEYS.SETTINGS_ROLE_EDIT)) ||
    (await checkPermission(user, PERMISSION_KEYS.RBAC_ROLE_PERMISSION_ASSIGN));
  if (!hasAccess) {
    return NextResponse.json({ error: "Insufficient permissions to view roles" }, { status: 403 });
  }

  const params = await context?.params;
  const idStr = params?.id;
  const id = idStr ? parseInt(idStr, 10) : NaN;
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true } },
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true } },
      users: {
        select: {
          id: true,
          empid: true,
          name: true,
          position: true,
          status: true,
        },
      },
      _count: { select: { users: true } },
    },
  });

  if (!role) return NextResponse.json({ error: "Employee type not found" }, { status: 404 });
  return NextResponse.json({ role }, { status: 200 });
}

export async function PUT(
  req: NextRequest,
  context?: { params?: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.SETTINGS_ROLE_EDIT);
  if (!hasAccess) {
    return NextResponse.json({ error: "Insufficient permissions to edit roles" }, { status: 403 });
  }

  const params = await context?.params;
  const idStr = params?.id;
  const id = idStr ? parseInt(idStr, 10) : NaN;
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const { name, description, status, parentId, permissionIds } = body;
  if (
    permissionIds !== undefined &&
    !(await checkPermission(user, PERMISSION_KEYS.RBAC_ROLE_PERMISSION_ASSIGN))
  ) {
    return NextResponse.json({ error: "Insufficient permissions to assign role permissions" }, { status: 403 });
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: "Employee type name is required" }, { status: 400 });
  }

  const existing = await prisma.role.findFirst({
    where: { name: name.trim(), NOT: { id } },
  });
  if (existing) {
    return NextResponse.json({ error: "An employee type with this name already exists" }, { status: 400 });
  }

  const currentRole = await prisma.role.findUnique({ where: { id } });
  if (!currentRole) return NextResponse.json({ error: "Employee type not found" }, { status: 404 });

  if (currentRole.type === "SUPER_ADMIN" && !(await checkPermission(user, "superadmin"))) {
    const isUserSuperAdmin = user.role === "superadmin" || user.roleId === 23;
    if (!isUserSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: Super Admin system role cannot be modified by ordinary administrators" }, { status: 403 });
    }
  }

  // Prevent circular hierarchy
  if (parentId && parseInt(parentId, 10) === id) {
    return NextResponse.json({ error: "A role cannot be its own parent" }, { status: 400 });
  }

  let resolvedParentId = parentId ? parseInt(parentId, 10) : null;
  if (!resolvedParentId) {
    if (currentRole.name !== "Super Admin" && currentRole.type !== "SUPER_ADMIN") {
      const superAdminRole = await ensureSuperAdminRole(prisma);
      if (superAdminRole && superAdminRole.id !== id) {
        resolvedParentId = superAdminRole.id;
      }
    }
  }

  const normalizedStatus =
    String(status).toUpperCase() === "INACTIVE"
      ? "INACTIVE"
      : String(status).toUpperCase() === "ARCHIVED"
      ? "ARCHIVED"
      : "ACTIVE";

  const role = await prisma.role.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      status: normalizedStatus as any,
      parentId: resolvedParentId,
      ...(Array.isArray(permissionIds)
        ? {
            permissions: {
              deleteMany: {},
              create: permissionIds.map((pid: number) => ({ permissionId: pid })),
            },
          }
        : {}),
    },
    include: {
      permissions: { include: { permission: true } },
      parent: { select: { id: true, name: true } },
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json({ role }, { status: 200 });
}

export async function DELETE(
  req: NextRequest,
  context?: { params?: Promise<{ id: string }> }
) {
  const { user, errorResponse } = await getAuthenticatedUser(req);
  if (errorResponse) return errorResponse;

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.SETTINGS_ROLE_DELETE);
  if (!hasAccess) {
    return NextResponse.json({ error: "Insufficient permissions to delete roles" }, { status: 403 });
  }

  const params = await context?.params;
  const idStr = params?.id;
  const id = idStr ? parseInt(idStr, 10) : NaN;
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const targetRole = await prisma.role.findUnique({ where: { id } });
  if (!targetRole) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  if (targetRole.type === "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Cannot delete protected system role (Super Admin)" },
      { status: 403 }
    );
  }

  // Unlink users before deleting
  await prisma.users.updateMany({ where: { roleId: id }, data: { roleId: null } });
  await prisma.role.delete({ where: { id } });
  return NextResponse.json({ message: "Employee type deleted successfully" }, { status: 200 });
}
