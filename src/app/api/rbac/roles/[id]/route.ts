// src/app/api/rbac/roles/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { PERMISSIONS } from "@/rbac/permissions";
import { RoleType, RoleStatus } from "@/rbac/types";
import { isSuperAdmin } from "@/rbac/service";

/**
 * GET /api/rbac/roles/:id
 * Retrieve single role details.
 */
export async function GET(
  req: NextRequest,
  context?: { params?: Promise<{ id: string }> }
) {
  const auth = await checkAuth(req, [PERMISSIONS.RBAC.ROLE_MANAGE, PERMISSIONS.SETTINGS.EMPLOYEE_TYPES_MANAGE]);
  if (auth.error) return auth.error;

  const params = await context?.params;
  const id = params?.id ? parseInt(params.id, 10) : NaN;
  if (isNaN(id)) return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });

  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: { include: { permission: true } },
      parent: { select: { id: true, name: true, type: true } },
      children: { select: { id: true, name: true, type: true } },
      users: {
        select: {
          id: true,
          empid: true,
          name: true,
          email: true,
          position: true,
          status: true,
        },
      },
      _count: { select: { users: true } },
    },
  });

  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  return NextResponse.json({ role }, { status: 200 });
}

/**
 * PATCH / PUT /api/rbac/roles/:id
 * Update role information and permission assignments.
 */
async function handleUpdate(
  req: NextRequest,
  context?: { params?: Promise<{ id: string }> }
) {
  const auth = await checkAuth(req, [PERMISSIONS.RBAC.ROLE_MANAGE, PERMISSIONS.SETTINGS.EMPLOYEE_TYPES_MANAGE]);
  if (auth.error) return auth.error;

  const user = auth.user!;
  const params = await context?.params;
  const id = params?.id ? parseInt(params.id, 10) : NaN;
  if (isNaN(id)) return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });

  const targetRole = await prisma.role.findUnique({ where: { id } });
  if (!targetRole) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  if (targetRole.type === RoleType.SUPER_ADMIN && !isSuperAdmin(user)) {
    return NextResponse.json(
      { error: "Forbidden: Super Admin system role can only be modified by Super Admin" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { name, description, status, parentId, permissionIds } = body;

  const updateData: any = {};

  if (name && typeof name === "string" && name.trim()) {
    const trimmed = name.trim();
    const existing = await prisma.role.findFirst({
      where: { name: trimmed, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: "A role with this name already exists" }, { status: 400 });
    }
    updateData.name = trimmed;
  }

  if (description !== undefined) {
    updateData.description = typeof description === "string" ? description.trim() : null;
  }

  if (status) {
    const s = String(status).toUpperCase();
    if (s === "INACTIVE") updateData.status = RoleStatus.INACTIVE;
    else if (s === "ARCHIVED") updateData.status = RoleStatus.ARCHIVED;
    else updateData.status = RoleStatus.ACTIVE;
  }

  // Prevent circular hierarchy
  if (parentId !== undefined) {
    if (parentId === null || parentId === "") {
      updateData.parentId = null;
    } else {
      const parsedParentId = parseInt(String(parentId), 10);
      if (parsedParentId === id) {
        return NextResponse.json({ error: "A role cannot be its own parent" }, { status: 400 });
      }
      const parentRole = await prisma.role.findUnique({ where: { id: parsedParentId } });
      if (!parentRole) {
        return NextResponse.json({ error: "Parent role not found" }, { status: 400 });
      }
      updateData.parentId = parsedParentId;
    }
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // If permissionIds provided, update assignments transactionally
      if (Array.isArray(permissionIds)) {
        // Validate that permission IDs exist
        const validPerms = await tx.permission.findMany({
          where: {
            id: { in: permissionIds.map((pid: any) => Number(pid)).filter((pid: number) => !isNaN(pid)) },
            isActive: true,
          },
          select: { id: true, isSystem: true },
        });

        // Non-superadmins cannot assign system permissions
        const allowedPermIds = !isSuperAdmin(user)
          ? validPerms.filter((p) => !p.isSystem).map((p) => p.id)
          : validPerms.map((p) => p.id);

        // Replace assignments
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (allowedPermIds.length > 0) {
          await tx.rolePermission.createMany({
            data: allowedPermIds.map((pid) => ({
              roleId: id,
              permissionId: pid,
            })),
          });
        }
      }

      return tx.role.update({
        where: { id },
        data: updateData,
        include: {
          permissions: { include: { permission: true } },
          parent: { select: { id: true, name: true, type: true } },
          _count: { select: { users: true } },
        },
      });
    });

    return NextResponse.json({ role: updated }, { status: 200 });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }
}

export const PUT = handleUpdate;
export const PATCH = handleUpdate;

/**
 * DELETE /api/rbac/roles/:id
 * Delete a role (protected: system roles cannot be deleted).
 */
export async function DELETE(
  req: NextRequest,
  context?: { params?: Promise<{ id: string }> }
) {
  const auth = await checkAuth(req, [PERMISSIONS.RBAC.ROLE_MANAGE, PERMISSIONS.SETTINGS.EMPLOYEE_TYPES_MANAGE]);
  if (auth.error) return auth.error;

  const user = auth.user!;
  const params = await context?.params;
  const id = params?.id ? parseInt(params.id, 10) : NaN;
  if (isNaN(id)) return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  // Protected system role guard
  if (role.type === RoleType.SUPER_ADMIN) {
    return NextResponse.json(
      { error: "Cannot delete protected Super Admin system role" },
      { status: 403 }
    );
  }

  // Prevent non-superadmin from deleting roles without permission
  if (!isSuperAdmin(user) && !auth.permissions?.has(PERMISSIONS.RBAC.ROLE_MANAGE)) {
    return NextResponse.json({ error: "Forbidden: insufficient permissions" }, { status: 403 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Unlink users from this role
      await tx.users.updateMany({
        where: { roleId: id },
        data: { roleId: null },
      });

      // Update any child roles whose parentId was this role
      await tx.role.updateMany({
        where: { parentId: id },
        data: { parentId: null },
      });

      // Delete role permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Delete the role
      await tx.role.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Role deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Failed to delete role" }, { status: 500 });
  }
}
