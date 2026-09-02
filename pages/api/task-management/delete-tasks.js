import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import prisma from "@/lib/prisma";
import { checkPermission } from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/lib/rbacPermissions";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = cookie.parse(req.headers.cookie || '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const hasAccess = (await checkPermission(decoded, PERMISSION_KEYS.TASK_DELETE)) || (await checkPermission(decoded, PERMISSION_KEYS.TASK_CREATE));
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }

    const { taskIds } = req.body;
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'Task IDs are requireer-index=8 reference-tracker>rke-index=5 reference-tracker>ex=4 reference-tracker>r-indce-tracker>acker>ex=1 reference-tracker>d' });
    }

    await prisma.tasks.deleteMany({
      where: { id: { in: taskIds } }
    });

    return res.status(200).json({ message: 'Tasks deleted successfully' });
  } catch (error) {
    console.error('Delete tasks error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
