// pages/api/settings/employee-types/[id].js
import { withSessionTimeout } from '@/lib/authMiddleware';
import { isSuperAdmin, ensureSuperAdminRole, checkPermission } from '@/lib/rbac';
import { PERMISSION_KEYS } from '@/lib/rbacPermissions';
import prisma from '@/lib/prisma';

async function handler(req, res) {
  const user = req.user;

  const hasAccess = await checkPermission(user, PERMISSION_KEYS.SETTINGS_EMPLOYEE_TYPES_MANAGE);
  if (!hasAccess) {
    return res.status(403).json({ error: 'Insufficient permissions to manage employee types' });
  }

  const id = parseInt(req.query.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

  if (req.method === 'GET') {
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

    if (!role) return res.status(404).json({ error: 'Employee type not found' });
    return res.status(200).json({ role });
  }

  if (req.method === 'PUT') {
    const { name, description, status, parentId, permissionIds = [] } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Employee type name is required' });
    }

    const existing = await prisma.role.findFirst({
      where: { name: name.trim(), NOT: { id } },
    });
    if (existing) {
      return res.status(400).json({ error: 'An employee type with this name already exists' });
    }

    // Prevent circular hierarchy
    if (parentId && parseInt(parentId) === id) {
      return res.status(400).json({ error: 'A role cannot be its own parent' });
    }

    let resolvedParentId = parentId ? parseInt(parentId, 10) : null;
    if (!resolvedParentId) {
      const currentRole = await prisma.role.findUnique({ where: { id } });
      if (currentRole && currentRole.name !== 'Super Admin') {
        const superAdminRole = await ensureSuperAdminRole(prisma);
        if (superAdminRole && superAdminRole.id !== id) {
          resolvedParentId = superAdminRole.id;
        }
      }
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status,
        parentId: resolvedParentId,
        permissions: {
          deleteMany: {},
          create: permissionIds.map((pid) => ({ permissionId: pid })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
        parent: { select: { id: true, name: true } },
        _count: { select: { users: true } },
      },
    });

    return res.status(200).json({ role });
  }

  if (req.method === 'DELETE') {
    // Unlink users before deleting
    await prisma.users.updateMany({ where: { roleId: id }, data: { roleId: null } });
    await prisma.role.delete({ where: { id } });
    return res.status(200).json({ message: 'Employee type deleted successfully' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withSessionTimeout(handler);
