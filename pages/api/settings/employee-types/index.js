// pages/api/settings/employee-types/index.js
import { withSessionTimeout } from '@/lib/authMiddleware';
import { isSuperAdmin, getAssignableRolesForUser } from '@/lib/rbac';
import prisma from '@/lib/prisma';

async function handler(req, res) {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const isAllowed = isSuperAdmin(user) || ['admin', 'hr', 'superadmin', 'ceo'].includes(user.role?.toLowerCase());
    if (!isAllowed) {
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

  if (!isSuperAdmin(user)) {
    return res.status(403).json({ error: 'Only Super Admin can manage employee types' });
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

    const role = await prisma.role.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status,
        parentId: parentId ? parseInt(parentId) : null,
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
