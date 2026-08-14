// pages/api/settings/employee-types/permissions.js
import { withSessionTimeout } from '@/lib/authMiddleware';
import { isSuperAdmin } from '@/lib/rbac';
import { PERMISSIONS } from '@/lib/rbacPermissions';
import prisma from '@/lib/prisma';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Auto-sync: upsert every permission from the config file into the DB.
  // New permissions added by developers appear immediately — no manual sync needed.
  await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: { description: p.description, category: p.category },
        create: { key: p.key, description: p.description, category: p.category },
      })
    )
  );

  const permissions = await prisma.permission.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });

  const grouped = permissions.reduce((acc, perm) => {
    const cat = perm.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(perm);
    return acc;
  }, {});

  return res.status(200).json({ grouped });
}

export default withSessionTimeout(handler);
