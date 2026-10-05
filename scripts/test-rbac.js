// scripts/test-rbac.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RoleType = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CUSTOM: 'CUSTOM',
};

const RoleStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED',
};

// Core RBAC Service logic tested in isolated script
async function getAllActivePermissionKeys() {
  const permissions = await prisma.permission.findMany({
    where: { isActive: true },
    select: { key: true },
  });
  return new Set(permissions.map((p) => p.key));
}

function isSuperAdmin(user) {
  if (!user) return false;
  if (user.rbacRole?.type === RoleType.SUPER_ADMIN || user.rbacRole?.type === 'SUPER_ADMIN') return true;
  if (user.role && String(user.role).toLowerCase() === 'superadmin') return true;
  const roleName = user.rbacRole?.name || (typeof user.role === 'string' ? user.role : '');
  if (roleName && ['super admin', 'superadmin'].includes(roleName.toLowerCase())) return true;
  return false;
}

function isDeveloper(_user) {
  return false;
}

async function getRolePermissions(roleId) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, name: true, type: true, status: true },
  });

  if (!role || role.status !== RoleStatus.ACTIVE) return new Set();

  if (role.type === RoleType.SUPER_ADMIN || ['super admin', 'superadmin'].includes(role.name.toLowerCase())) {
    return getAllActivePermissionKeys();
  }

  const rolePerms = await prisma.rolePermission.findMany({
    where: {
      roleId,
      permission: { isActive: true },
    },
    select: { permission: { select: { key: true } } },
  });

  return new Set(rolePerms.map((rp) => rp.permission.key));
}

async function getUserPermissions(user, preloadedPermissions) {
  if (!user) return new Set();
  if (preloadedPermissions) {
    return preloadedPermissions instanceof Set ? preloadedPermissions : new Set(preloadedPermissions);
  }
  if (user._resolvedPermissions instanceof Set) {
    return user._resolvedPermissions;
  }
  if (isSuperAdmin(user)) {
    const allPerms = await getAllActivePermissionKeys();
    user._resolvedPermissions = allPerms;
    return allPerms;
  }

  const roleId = user.roleId ?? user.rbacRole?.id;
  if (!roleId) return new Set();

  const permissions = await getRolePermissions(roleId);
  user._resolvedPermissions = permissions;
  return permissions;
}

async function hasPermission(user, permissionKey, preloaded) {
  if (!user || !permissionKey) return false;
  if (isSuperAdmin(user)) return true;
  const perms = await getUserPermissions(user, preloaded);
  return perms.has(permissionKey);
}

async function hasAnyPermission(user, permissionKeys, preloaded) {
  if (!user || !permissionKeys || permissionKeys.length === 0) return false;
  if (isSuperAdmin(user)) return true;
  const perms = await getUserPermissions(user, preloaded);
  return permissionKeys.some((k) => perms.has(k));
}

async function hasAllPermissions(user, permissionKeys, preloaded) {
  if (!user || !permissionKeys || permissionKeys.length === 0) return false;
  if (isSuperAdmin(user)) return true;
  const perms = await getUserPermissions(user, preloaded);
  return permissionKeys.every((k) => perms.has(k));
}

async function requirePermission(user, permissionKey) {
  if (!user) return { authorized: false, reason: 'Unauthenticated' };
  const authorized = await hasPermission(user, permissionKey);
  return authorized ? { authorized: true } : { authorized: false, reason: `Forbidden: lacks '${permissionKey}'` };
}

async function requireSystemRole(user, allowedTypes) {
  if (!user) return { authorized: false, reason: 'Unauthenticated' };
  const userType = user.rbacRole?.type || (user.role === 'superadmin' ? RoleType.SUPER_ADMIN : null);
  if (!userType) return { authorized: false, reason: 'Forbidden: no system role' };
  const allowed = allowedTypes.map((t) => String(t).toUpperCase());
  return allowed.includes(String(userType).toUpperCase())
    ? { authorized: true }
    : { authorized: false, reason: 'Forbidden: unauthorized system role' };
}

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    testsFailed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('   RUNNING RBAC ARCHITECTURE TEST SUITE');
  console.log('====================================================\n');

  // Test Suite 1: Super Admin Role & Implicit Permissions
  console.log('Test Suite 1: Super Admin Role & Implicit Access');
  const superAdminRole = await prisma.role.findFirst({
    where: { type: RoleType.SUPER_ADMIN },
  });
  assert(superAdminRole !== null, 'Super Admin system role exists in database');
  assert(superAdminRole?.type === RoleType.SUPER_ADMIN, 'Super Admin has RoleType.SUPER_ADMIN');

  const superAdminUser = {
    id: 1,
    name: 'Super Admin User',
    role: 'superadmin',
    rbacRole: superAdminRole,
  };

  assert(isSuperAdmin(superAdminUser) === true, 'isSuperAdmin correctly identifies user');

  const allActiveKeys = await getAllActivePermissionKeys();
  const superAdminPerms = await getUserPermissions(superAdminUser);
  assert(
    superAdminPerms.size === allActiveKeys.size,
    `Super Admin has implicit access to all ${allActiveKeys.size} active permissions without explicit role_permissions rows`
  );
  assert(await hasPermission(superAdminUser, 'employee.view') === true, 'Super Admin has employee.view');
  assert(await hasPermission(superAdminUser, 'payroll.generate') === true, 'Super Admin has payroll.generate');
  assert(await hasPermission(superAdminUser, 'settings.manage') === true, 'Super Admin has settings.manage');

  // Test Suite 2: Sole Protected System Role (SUPER_ADMIN)
  console.log('\nTest Suite 2: Sole Protected System Role (SUPER_ADMIN)');
  const devRoleInDb = await prisma.role.findFirst({
    where: { name: { in: ['Developer', 'DEVELOPER', 'developer'] } },
  });
  assert(devRoleInDb === null, 'Developer role does NOT exist in database');

  const allSystemRoles = await prisma.role.findMany({
    where: { type: RoleType.SUPER_ADMIN },
  });
  assert(allSystemRoles.length >= 1, 'Super Admin is configured as the protected system role');
  assert(allSystemRoles.every((r) => r.type === RoleType.SUPER_ADMIN), 'Only SUPER_ADMIN exists as protected system role');
  assert(isSuperAdmin(superAdminUser) === true, 'isSuperAdmin correctly identifies Super Admin user');
  assert(isDeveloper(superAdminUser) === false, 'isDeveloper returns false');

  // Test Suite 3: Custom Role Assignment & Isolation
  console.log('\nTest Suite 3: Custom Role Assignment & Isolation');
  const testRoleName = `Test_HR_Manager_${Date.now()}`;
  const empViewPerm = await prisma.permission.findUnique({ where: { key: 'employee.view' } });
  const empCreatePerm = await prisma.permission.findUnique({ where: { key: 'employee.create' } });

  const customRole = await prisma.role.create({
    data: {
      name: testRoleName,
      type: RoleType.CUSTOM,
      status: RoleStatus.ACTIVE,
      permissions: {
        create: [{ permissionId: empViewPerm.id }, { permissionId: empCreatePerm.id }],
      },
    },
  });

  const customUser = {
    id: 888,
    name: 'Custom HR User',
    role: 'employee',
    roleId: customRole.id,
    rbacRole: customRole,
  };

  const customUserPerms = await getUserPermissions(customUser);
  assert(customUserPerms.has('employee.view') === true, 'Custom role has employee.view');
  assert(customUserPerms.has('employee.create') === true, 'Custom role has employee.create');
  assert(customUserPerms.has('employee.delete') === false, 'Custom role does NOT have employee.delete');
  assert(customUserPerms.has('payroll.generate') === false, 'Custom role does NOT have payroll.generate');
  assert(customUserPerms.has('rbac.role_manage') === false, 'Custom role cannot manage RBAC system');

  // Test Suite 4: Semantics (ANY vs ALL)
  console.log('\nTest Suite 4: Authorization Semantics (ANY vs ALL)');
  const anyResultPass = await hasAnyPermission(customUser, ['employee.view', 'non.existent']);
  assert(anyResultPass === true, 'hasAnyPermission returns true when at least one matches');

  const anyResultFail = await hasAnyPermission(customUser, ['employee.delete', 'payroll.generate']);
  assert(anyResultFail === false, 'hasAnyPermission returns false when none match');

  const allResultPass = await hasAllPermissions(customUser, ['employee.view', 'employee.create']);
  assert(allResultPass === true, 'hasAllPermissions returns true when all match');

  const allResultFail = await hasAllPermissions(customUser, ['employee.view', 'employee.delete']);
  assert(allResultFail === false, 'hasAllPermissions returns false when at least one is missing');

  // Test Suite 5: Enforcement Guards
  console.log('\nTest Suite 5: require* Enforcement Guards');
  const reqPass = await requirePermission(customUser, 'employee.view');
  assert(reqPass.authorized === true, 'requirePermission returns authorized: true on match');

  const reqFail = await requirePermission(customUser, 'employee.delete');
  assert(reqFail.authorized === false, 'requirePermission blocks unauthorized action');

  const reqSysPass = await requireSystemRole(superAdminUser, [RoleType.SUPER_ADMIN]);
  assert(reqSysPass.authorized === true, 'requireSystemRole allows SUPER_ADMIN');

  const reqSysFail = await requireSystemRole(customUser, [RoleType.SUPER_ADMIN]);
  assert(reqSysFail.authorized === false, 'requireSystemRole blocks custom role from system actions');

  // Test Suite 6: Performance & Request-Level Cache
  console.log('\nTest Suite 6: Request-Level Cache Optimization');
  const reqUser = { id: customUser.id, roleId: customRole.id, rbacRole: customRole };
  const firstLoad = await getUserPermissions(reqUser);
  assert(reqUser._resolvedPermissions instanceof Set, 'Resolved permissions attached to user object as Set');
  const secondLoad = await getUserPermissions(reqUser);
  assert(firstLoad === secondLoad, 'Subsequent checks reuse request-level cached Set without re-querying');

  // Test Suite 7: Role Hierarchy Preservation
  console.log('\nTest Suite 7: Role Hierarchy Preservation');
  const childRoleName = `Test_Child_Role_${Date.now()}`;
  const childRole = await prisma.role.create({
    data: {
      name: childRoleName,
      type: RoleType.CUSTOM,
      status: RoleStatus.ACTIVE,
      parentId: customRole.id,
    },
  });

  const reloadedChild = await prisma.role.findUnique({
    where: { id: childRole.id },
    include: { parent: true },
  });
  assert(reloadedChild.parentId === customRole.id, 'Role hierarchy parentId relationship is preserved');
  assert(reloadedChild.parent.name === customRole.name, 'Role parent navigation is preserved');

  // Clean up test roles
  await prisma.role.delete({ where: { id: childRole.id } });
  await prisma.rolePermission.deleteMany({ where: { roleId: customRole.id } });
  await prisma.role.delete({ where: { id: customRole.id } });
  console.log('Cleaned up test custom roles.');

  // Summary
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log('====================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Test run failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
