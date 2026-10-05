// src/app/api/rbac/roles/route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkAuth } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { PERMISSIONS } from "@/rbac/permissions";
import { RoleType, RoleStatus } from "@/rbac/types";
import { isSuperAdmin } from "@/rbac/service";

/**
 * GET /api/rbac/roles
 * List all roles with permission count, user count, and hierarchy.
 */
export async function GET(req: NextRequest) {
  const auth = await checkAuth(req, [PERMISSIONS.RBAC.ROLE_MANAGE, PERMISSIONS.SETTINGS.EMPLOYEE_TYPES_MANAGE]);
  if (auth.error) return auth.error;

  try {
    const roles = await prisma.role.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        parent: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return NextResponse.json({ roles }, { status: 200 });
  } catch (error) {
    console.error("Error fetching RBAC roles:", error);
    return NextResponse.json({ error: "Failed to fetch roles" }, { status: 500 });
  }
}

/**
 * POST /api/rbac/roles
 * Create a new role.
 */
export async function POST(req: NextRequest) {
  const auth = await checkAuth(req, [PERMISSIONS.RBAC.ROLE_MANAGE, PERMISSIONS.SETTINGS.EMPLOYEE_TYPES_MANAGE]);
  if (auth.error) return auth.error;

  const user = auth.user!;
  const body = await req.json().catch(() => ({}));
  const { name, description, status = RoleStatus.ACTIVE, parentId, permissionIds = [], companyId } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Role name is required" }, { status: 400 });
  }

  const trimmedName = name.trim();

  // Check unique name
  const existing = await prisma.role.findUnique({ where: { name: trimmedName } });
  if (existing) {
    return NextResponse.json({ error: "A role with this name already exists" }, { status: 400 });
  }

  // Validate parent hierarchy
  let resolvedParentId: number | null = null;
  if (parentId) {
    const parsedParentId = parseInt(String(parentId), 10);
    if (!isNaN(parsedParentId)) {
      const parentRole = await prisma.role.findUnique({ where: { id: parsedParentId } });
      if (!parentRole) {
        return NextResponse.json({ error: "Parent role not found" }, { status: 400 });
      }
      resolvedParentId = parsedParentId;
    }
  }

  // Validate permission IDs exist in database
  let validPermissionIds: number[] = [];
  if (Array.isArray(permissionIds) && permissionIds.length > 0) {
    const existingPerms = await prisma.permission.findMany({
      where: {
        id: { in: permissionIds.map((id: any) => Number(id)).filter((id: number) => !isNaN(id)) },
        isActive: true,
      },
      select: { id: true, isSystem: true },
    });

    // Prevent non-superadmins from assigning system permissions
    if (!isSuperAdmin(user)) {
      validPermissionIds = existingPerms.filter((p) => !p.isSystem).map((p) => p.id);
    } else {
      validPermissionIds = existingPerms.map((p) => p.id);
    }
  }

  // Normalize status
  const normalizedStatus =
    String(status).toUpperCase() === "INACTIVE"
      ? RoleStatus.INACTIVE
      : String(status).toUpperCase() === "ARCHIVED"
      ? RoleStatus.ARCHIVED
      : RoleStatus.ACTIVE;

  // Only Super Admin may create system roles; custom roles always get CUSTOM
  const roleType = isSuperAdmin(user) && body.type && Object.values(RoleType).includes(body.type)
    ? body.type
    : RoleType.CUSTOM;

  try {
    const role = await prisma.$transaction(async (tx) => {
      const newRole = await tx.role.create({
        data: {
          name: trimmedName,
          description: description?.trim() || null,
          type: roleType,
          status: normalizedStatus,
          parentId: resolvedParentId,
          companyId: companyId || user.companyId || null,
          permissions: {
            create: validPermissionIds.map((pid) => ({
              permissionId: pid,
            })),
          },
        },
        include: {
          permissions: { include: { permission: true } },
          parent: { select: { id: true, name: true } },
          _count: { select: { users: true } },
        },
      });

      return newRole;
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json({ error: "Failed to create role" }, { status: 500 });
  }
}
