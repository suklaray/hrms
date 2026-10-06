const { PrismaClient } = require('f:/Office works/hrms/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function columnExists(table, column) {
  const result = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = ? 
      AND COLUMN_NAME = ?
  `, table, column);
  return Number(result[0].cnt) > 0;
}

async function constraintExists(table, constraintName) {
  const result = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as cnt 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
      AND TABLE_NAME = ? 
      AND CONSTRAINT_NAME = ?
  `, table, constraintName);
  return Number(result[0].cnt) > 0;
}

async function main() {
  console.log('--- STARTING RBAC SCHEMA MIGRATION ---');

  // 1. Update roles.status values to uppercase before converting column type
  await prisma.$executeRawUnsafe(`
    UPDATE \`roles\` SET \`status\` = 'ACTIVE' WHERE LOWER(\`status\`) = 'active';
  `);
  console.log('✓ Normalized existing role status to ACTIVE');

  // 2. Add columns to permissions if not exists
  if (!await columnExists('permissions', 'name')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`permissions\` ADD COLUMN \`name\` VARCHAR(191) NULL;`);
    console.log('✓ Added permissions.name');
  }
  if (!await columnExists('permissions', 'module')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`permissions\` ADD COLUMN \`module\` VARCHAR(100) NULL;`);
    console.log('✓ Added permissions.module');
  }
  if (!await columnExists('permissions', 'action')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`permissions\` ADD COLUMN \`action\` VARCHAR(100) NULL;`);
    console.log('✓ Added permissions.action');
  }
  if (!await columnExists('permissions', 'isSystem')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`permissions\` ADD COLUMN \`isSystem\` BOOLEAN NOT NULL DEFAULT FALSE;`);
    console.log('✓ Added permissions.isSystem');
  }
  if (!await columnExists('permissions', 'isActive')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`permissions\` ADD COLUMN \`isActive\` BOOLEAN NOT NULL DEFAULT TRUE;`);
    console.log('✓ Added permissions.isActive');
  }
  if (!await columnExists('permissions', 'updatedAt')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`permissions\` ADD COLUMN \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);`);
    console.log('✓ Added permissions.updatedAt');
  }

  // 3. Add columns to roles if not exists
  if (!await columnExists('roles', 'type')) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`roles\` ADD COLUMN \`type\` ENUM('SUPER_ADMIN', 'DEVELOPER', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM';
    `);
    console.log('✓ Added roles.type');
  }

  // Update roles.status to ENUM if it is still VARCHAR
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`roles\` MODIFY COLUMN \`status\` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE';
    `);
    console.log('✓ Converted roles.status to ENUM(ACTIVE, INACTIVE, ARCHIVED)');
  } catch (err) {
    console.warn('roles.status modify notice:', err.message);
  }

  if (!await columnExists('roles', 'company_id')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`roles\` ADD COLUMN \`company_id\` VARCHAR(191) NULL;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE \`roles\` ADD INDEX \`roles_company_id_idx\` (\`company_id\`);`);
    console.log('✓ Added roles.company_id and index');
  }

  // Check FK on roles.company_id
  const hasCompanyFk = await constraintExists('roles', 'roles_company_id_fkey');
  if (!hasCompanyFk) {
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE \`roles\` ADD CONSTRAINT \`roles_company_id_fkey\` 
        FOREIGN KEY (\`company_id\`) REFERENCES \`company\` (\`uid\`) ON DELETE SET NULL ON UPDATE CASCADE;
      `);
      console.log('✓ Added FK constraint roles.company_id -> company.uid');
    } catch (err) {
      console.warn('FK constraint notice:', err.message);
    }
  }

  console.log('--- RBAC SCHEMA MIGRATION COMPLETED SUCCESSFULLY ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
