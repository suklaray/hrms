// pages/api/settings/employee-types/index.js
import { withSessionTimeout } from '@/lib/authMiddleware';
import { isSuperAdmin, getAssignableRolesForUser, ensureSuperAdminRole, checkPermission } from '@/lib/rbac';
import { PERMISSION_KEYS } from '@/lib/rbacPermissions';
import prisma from '@/lib/prisma';

async function handler(req, res) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.SETTINGS_EMPLOYEE_TYPES_MANAGE);

  if (req.method === 'GET') {
    if (!hasAccess) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const roles = await prisma.role.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    const assignableRoles = await getAssignableRolesForUser(user);

    return res.status(200).json({ roles, assignableRoles });
  }

  if (!hasAccess) {
    return res.status(403).json({ error: 'Insufficient permissions to manage employee types' });
  }

  if (req.method === 'POST') {
    const { name, description, status = 'active', parentId, permissionIds = [] } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Employee type name is required' });
    }

    const existing = await prisma.role.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return res.status(400).json({ error: 'An employee type with this name already exists' });
    }

    let resolvedParentId = parentId ? parseInt(parentId, 10) : null;
    if (!resolvedParentId) {
      const superAdminRole = await ensureSuperAdminRole(prisma);
      if (superAdminRole && superAdminRole.name !== name.trim()) {
        resolvedParentId = superAdminRole.id;
      }
    }

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status,
        parentId: resolvedParentId,
        permissions: {
          create: permissionIds.map((id) => ({ permissionId: id })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });

    return res.status(201).json({ role });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withSessionTimeout(handler);
