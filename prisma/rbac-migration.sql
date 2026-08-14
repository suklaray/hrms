-- ============================================================
-- RBAC Migration DDL
-- Run this ONCE against your MySQL database.
-- Safe to run on existing DB — uses IF NOT EXISTS / IF EXISTS.
-- ============================================================

-- 1. Roles table
CREATE TABLE IF NOT EXISTS `roles` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(100) NOT NULL,
  `description` VARCHAR(255)     NULL,
  `status`      VARCHAR(20)  NOT NULL DEFAULT 'active',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add status column if table already exists
ALTER TABLE `roles` ADD COLUMN IF NOT EXISTS `status` VARCHAR(20) NOT NULL DEFAULT 'active';

-- 2. Permissions table
CREATE TABLE IF NOT EXISTS `permissions` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `key`         VARCHAR(100) NOT NULL,
  `description` VARCHAR(255)     NULL,
  `category`    VARCHAR(100) NOT NULL DEFAULT 'General',
  `createdAt`   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add category column if table already exists
ALTER TABLE `permissions` ADD COLUMN IF NOT EXISTS `category` VARCHAR(100) NOT NULL DEFAULT 'General';

-- 3. Role ↔ Permission mapping
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `roleId`       INT NOT NULL,
  `permissionId` INT NOT NULL,
  PRIMARY KEY (`roleId`, `permissionId`),
  CONSTRAINT `role_permissions_roleId_fkey`
    FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permissions_permissionId_fkey`
    FOREIGN KEY (`permissionId`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Seed default permissions (safe — INSERT IGNORE skips duplicates)
INSERT IGNORE INTO `permissions` (`key`, `description`, `category`) VALUES
  -- Employee
  ('employee.view',           'View employee list',           'Employee'),
  ('employee.create',         'Create new employee',          'Employee'),
  ('employee.edit',           'Edit employee details',        'Employee'),
  ('employee.delete',         'Delete employee',              'Employee'),
  -- Attendance
  ('attendance.view',         'View attendance records',      'Attendance'),
  ('attendance.edit',         'Edit attendance records',      'Attendance'),
  ('attendance.regularize',   'Attendance regularization',    'Attendance'),
  -- Leave
  ('leave.view',              'View leave requests',          'Leave'),
  ('leave.approve',           'Approve/reject leave',         'Leave'),
  ('leave.manage_types',      'Manage leave types',           'Leave'),
  -- Payroll
  ('payroll.view',            'View payroll',                 'Payroll'),
  ('payroll.generate',        'Generate payroll',             'Payroll'),
  ('payroll.manage',          'Manage payroll settings',      'Payroll'),
  -- Recruitment
  ('recruitment.view',        'View recruitment',             'Recruitment'),
  ('recruitment.manage',      'Manage recruitment',           'Recruitment'),
  -- Task Management
  ('task.view',               'View tasks',                   'Task Management'),
  ('task.create',             'Create tasks',                 'Task Management'),
  ('task.manage',             'Manage all tasks',             'Task Management'),
  -- Compliance
  ('compliance.view',         'View compliance',              'Compliance'),
  ('compliance.manage',       'Manage compliance',            'Compliance'),
  -- Settings
  ('settings.view',           'View settings',                'Settings'),
  ('settings.manage',         'Manage settings',              'Settings'),
  ('employee_types.manage',   'Manage employee types',        'Settings'),
  -- Dashboard
  ('dashboard.view',          'View dashboard',               'Dashboard'),
  -- Calendar
  ('calendar.view',           'View calendar',                'Calendar'),
  ('calendar.manage',         'Manage calendar events',       'Calendar');

-- 5. Add roleId FK on users (column already exists as INT NULL after schema change)
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME        = 'users'
    AND CONSTRAINT_NAME   = 'users_roleId_fkey'
    AND CONSTRAINT_TYPE   = 'FOREIGN KEY'
);

SET @sql = IF(
  @fk_exists = 0,
  'ALTER TABLE `users` ADD CONSTRAINT `users_roleId_fkey`
     FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
