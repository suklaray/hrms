// scripts/rbac-sync.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Read permissions directly from src/rbac/permissions.ts
function loadPermissionsFromCode() {
  const filePath = path.join(__dirname, '..', 'src', 'rbac', 'permissions.ts');
  const content = fs.readFileSync(filePath, 'utf8');

  // Parse PERMISSION_DEFINITIONS from file
  const defsMatch = content.match(/export const PERMISSION_DEFINITIONS:\s*PermissionDefinition\[\]\s*=\s*\[([\s\S]*?)\];/);
  if (!defsMatch) {
    throw new Error('Could not find PERMISSION_DEFINITIONS in src/rbac/permissions.ts');
  }

  // Extract definition objects safely
  const rawArrayContent = defsMatch[1];
  const items = [];
  const objectRegex = /\{([\s\S]*?)\}/g;
  let match;

  while ((match = objectRegex.exec(rawArrayContent)) !== null) {
    const objBlock = match[1];
    const keyMatch = objBlock.match(/key:\s*(?:PERMISSIONS\.[A-Z0-9_]+\.[A-Z0-9_]+|["']([^"']+)["'])/);
    const nameMatch = objBlock.match(/name:\s*["']([^"']+)["']/);
    const descMatch = objBlock.match(/description:\s*["']([^"']+)["']/);
    const moduleMatch = objBlock.match(/module:\s*["']([^"']+)["']/);
    const actionMatch = objBlock.match(/action:\s*["']([^"']+)["']/);
    const isSystemMatch = objBlock.match(/isSystem:\s*(true|false)/);
    const isActiveMatch = objBlock.match(/isActive:\s*(true|false)/);

    let key = '';
    if (keyMatch) {
      if (keyMatch[1]) {
        key = keyMatch[1];
      } else {
        const fullExpr = keyMatch[0].replace(/key:\s*/, '').trim();
        const parts = fullExpr.split('.');
        if (parts.length === 3) {
          // Find value in PERMISSIONS object
          const modName = parts[1];
          const actName = parts[2];
          const permObjRegex = new RegExp(`\\b${modName}:\\s*\\{[\\s\\S]*?\\b${actName}:\\s*["']([^"']+)["']`, 'm');
          const valMatch = content.match(permObjRegex);
          if (valMatch) key = valMatch[1];
        }
      }
    }

    if (key) {
      items.push({
        key,
        name: nameMatch ? nameMatch[1] : key,
        description: descMatch ? descMatch[1] : '',
        module: moduleMatch ? moduleMatch[1] : key.split('.')[0],
        action: actionMatch ? actionMatch[1] : key.split('.')[1],
        isSystem: isSystemMatch ? isSystemMatch[1] === 'true' : false,
        isActive: isActiveMatch ? isActiveMatch[1] !== 'false' : true,
      });
    }
  }

  return items;
}

const MODULE_DISPLAY_NAMES = {
  dashboard: 'Dashboard',
  employee: 'Employee Management',
  attendance: 'Attendance',
  leave: 'Leave',
  payroll: 'Payroll',
  recruitment: 'Recruitment',
  compliance: 'Compliance',
  task: 'Task Management',
  report: 'Daily Reports',
  calendar: 'Calendar',
  customer: 'Customer Connect',
  notification: 'Notifications',
  document: 'Documents',
  settings: 'Settings',
  rbac: 'Role-Based Access Control',
  audit: 'Audit Logs',
};

async function syncRbac() {
  console.log('RBAC synchronization started...\n');

  const permissions = loadPermissionsFromCode();

  // 1. Validation
  const seenKeys = new Set();
  const duplicateKeys = [];
  const keyFormatRegex = /^[a-z0-9_]+\.[a-z0-9_]+$/;
  const invalidFormatKeys = [];
  const missingMetadataKeys = [];

  for (const p of permissions) {
    if (seenKeys.has(p.key)) {
      duplicateKeys.push(p.key);
    }
    seenKeys.add(p.key);

    if (!keyFormatRegex.test(p.key)) {
      invalidFormatKeys.push(p.key);
    }

    if (!p.name || !p.description || !p.module || !p.action) {
      missingMetadataKeys.push(p.key);
    }
  }

  if (duplicateKeys.length > 0) {
    throw new Error(`Duplicate permission keys found in code registry: ${duplicateKeys.join(', ')}`);
  }
  if (invalidFormatKeys.length > 0) {
    throw new Error(`Invalid permission key format (must be <module>.<action>): ${invalidFormatKeys.join(', ')}`);
  }
  if (missingMetadataKeys.length > 0) {
    throw new Error(`Missing metadata for permission keys: ${missingMetadataKeys.join(', ')}`);
  }

  console.log(`Validated ${permissions.length} canonical permission definitions in code registry.\n`);

  // 2. Fetch all existing permissions from database
  const existingDbPerms = await prisma.permission.findMany();
  const dbPermMap = new Map(existingDbPerms.map((p) => [p.key, p]));

  const created = [];
  const updated = [];
  const unchanged = [];

  // 3. Upsert each permission
  for (const def of permissions) {
    const existing = dbPermMap.get(def.key);
    const categoryName = MODULE_DISPLAY_NAMES[def.module] || def.module;

    if (!existing) {
      await prisma.permission.create({
        data: {
          key: def.key,
          name: def.name,
          description: def.description,
          category: categoryName,
          module: def.module,
          action: def.action,
          isSystem: def.isSystem,
          isActive: def.isActive,
        },
      });
      created.push(def.key);
    } else {
      const needsUpdate =
        existing.name !== def.name ||
        existing.description !== def.description ||
        existing.category !== categoryName ||
        existing.module !== def.module ||
        existing.action !== def.action ||
        existing.isSystem !== def.isSystem ||
        existing.isActive !== def.isActive;

      if (needsUpdate) {
        await prisma.permission.update({
          where: { key: def.key },
          data: {
            name: def.name,
            description: def.description,
            category: categoryName,
            module: def.module,
            action: def.action,
            isSystem: def.isSystem,
            isActive: def.isActive,
          },
        });
        updated.push(def.key);
      } else {
        unchanged.push(def.key);
      }
    }
  }

  // 4. Check for orphaned DB permissions
  const codeKeySet = new Set(permissions.map((p) => p.key));
  const orphanedInDb = existingDbPerms.filter((p) => !codeKeySet.has(p.key));

  // 5. Formalize System Role: SUPER_ADMIN
  let superAdminRole = await prisma.role.findFirst({
    where: {
      OR: [
        { type: 'SUPER_ADMIN' },
        { name: { in: ['Super Admin', 'SuperAdmin', 'super admin', 'superadmin'] } },
      ],
    },
  });

  if (superAdminRole) {
    if (superAdminRole.type !== 'SUPER_ADMIN' || superAdminRole.status !== 'ACTIVE') {
      superAdminRole = await prisma.role.update({
        where: { id: superAdminRole.id },
        data: { type: 'SUPER_ADMIN', status: 'ACTIVE' },
      });
    }
  } else {
    superAdminRole = await prisma.role.create({
      data: {
        name: 'Super Admin',
        description: 'System Super Administrator with implicit access to all permissions',
        type: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    });
  }

  // Remove any legacy developer role if present
  const legacyDev = await prisma.role.findFirst({
    where: { name: { in: ['Developer', 'DEVELOPER', 'developer'] } },
  });
  if (legacyDev) {
    await prisma.rolePermission.deleteMany({ where: { roleId: legacyDev.id } });
    await prisma.role.delete({ where: { id: legacyDev.id } }).catch(() => {});
  }

  // 6. Print Summary
  console.log('Created:');
  if (created.length > 0) {
    created.forEach((k) => console.log(`  + ${k}`));
  } else {
    console.log('  (none)');
  }

  console.log('\nUpdated:');
  if (updated.length > 0) {
    updated.forEach((k) => console.log(`  ~ ${k}`));
  } else {
    console.log('  (none)');
  }

  console.log(`\nUnchanged: ${unchanged.length} permissions.`);

  if (orphanedInDb.length > 0) {
    console.log('\nWARNING: Database permissions exist that are no longer registered in code:');
    orphanedInDb.forEach((p) => console.log(`  ! ${p.key} (ID: ${p.id})`));
    console.log('  (These permissions have NOT been deleted for data safety).');
  } else {
    console.log('\nOrphaned in database:\n  (none)');
  }

  console.log('\nSystem Role:');
  console.log(`  ✓ Super Admin: Role ID ${superAdminRole.id} (Type: ${superAdminRole.type}, Status: ${superAdminRole.status})`);

  console.log('\nRBAC synchronization completed successfully.\n');
}

if (require.main === module) {
  syncRbac()
    .catch((err) => {
      console.error('\nRBAC synchronization failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { syncRbac, loadPermissionsFromCode };
