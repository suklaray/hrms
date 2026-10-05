// src/app/api/rbac/roles/[id]/permissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { PERMISSIONS } from "@/rbac/permissions";
import { RoleType } from "@/rbac/types";
import { isSuperAdmin } from "@/rbac/service";

/**
 * GET /api/rbac/roles/:id/permissions
 * List all permissions assigned to a role.
 */
export async function GET(
  req: NextRequest,
  context?: { params?: Promise<{ id: string }> }
) {
  const auth = await checkAuth(req, [PERMISSIONS.RBAC.ROLE_ASSIGN, PERMISSIONS.RBAC.ROLE_MANAGE, PERMISSIONS.SETTINGS.EMPLOYEE_TYPES_MANAGE]);
  if (auth.error) return auth.error;

  const params = await context?.params;
  const id = params?.id ? parseInt(params.id, 10) : NaN;
  if (isNaN(id)) return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: { permission: true },
      },
    },
  });

  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  // For Super Admin, return all active permissions with isAssigned: true
  if (role.type === RoleType.SUPER_ADMIN) {
    const allPerms = await prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [{ module: "asc" }, { key: "asc" }],
    });
    return NextResponse.json({
      roleId: role.id,
      roleName: role.name,
      isSuperAdminRole: true,
      permissions: allPerms,
    });
  }

  const assignedPermissions = role.permissions.map((rp) => rp.permission);
  return NextResponse.json({
    roleId: role.id,
    roleName: role.name,
    permissions: assignedPermissions,
  });
}

/**
 * PUT /api/rbac/roles/:id/permissions
 * Transactionally assign permissions to a role.
 */
export async function PUT(
  req: NextRequest,
  context?: { params?: Promise<{ id: string }> }
) {
  const auth = await checkAuth(req, [PERMISSIONS.RBAC.ROLE_ASSIGN, PERMISSIONS.SETTINGS.EMPLOYEE_TYPES_MANAGE]);
  if (auth.error) return auth.error;

  const user = auth.user!;
  const params = await context?.params;
  const id = params?.id ? parseInt(params.id, 10) : NaN;
  if (isNaN(id)) return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  // Disallow explicit role-permission manipulation on Super Admin (Super Admin has implicit access)
  if (role.type === RoleType.SUPER_ADMIN) {
    return NextResponse.json(
      { message: "Super Admin implicitly has access to all permissions. Explicit assignment is not required." },
      { status: 200 }
    );
  }


  const body = await req.json().catch(() => ({}));
  const { permissionIds = [], permissionKeys = [] } = body;

  // Resolve target permission records
  let targetPermissions: { id: number; key: string; isSystem: boolean }[] = [];

  if (Array.isArray(permissionIds) && permissionIds.length > 0) {
    targetPermissions = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds.map((pid: any) => Number(pid)).filter((pid: number) => !isNaN(pid)) },
        isActive: true,
      },
      select: { id: true, key: true, isSystem: true },
    });
  } else if (Array.isArray(permissionKeys) && permissionKeys.length > 0) {
    targetPermissions = await prisma.permission.findMany({
      where: {
        key: { in: permissionKeys.filter((k: any) => typeof k === "string") },
        isActive: true,
      },
      select: { id: true, key: true, isSystem: true },
    });
  }

  // Privilege escalation check: non-superadmins cannot assign system permissions
  if (!isSuperAdmin(user)) {
    targetPermissions = targetPermissions.filter((p) => !p.isSystem);
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Clear existing assignments for this role
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Insert new assignments
      if (targetPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: targetPermissions.map((p) => ({
            roleId: id,
            permissionId: p.id,
          })),
          skipDuplicates: true,
        });
      }
    });

    return NextResponse.json({
      message: "Permissions updated successfully",
      roleId: id,
      assignedCount: targetPermissions.length,
      assignedKeys: targetPermissions.map((p) => p.key),
    });
  } catch (error) {
    console.error("Error updating role permissions:", error);
    return NextResponse.json({ error: "Failed to update role permissions" }, { status: 500 });
  }
}
