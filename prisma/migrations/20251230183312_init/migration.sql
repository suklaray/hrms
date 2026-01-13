-- CreateTable
CREATE TABLE `addresses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_id` INTEGER NOT NULL,
    `address_line1` VARCHAR(191) NOT NULL,
    `address_line2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `pincode` VARCHAR(191) NOT NULL,

    INDEX `addresses_employee_id_idx`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empid` VARCHAR(191) NOT NULL,
    `check_in` DATETIME(3) NULL,
    `check_out` DATETIME(3) NULL,
    `total_hours` DECIMAL(65, 30) NULL,
    `date` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `attendance_status` ENUM('Present', 'Absent') NULL DEFAULT 'Absent',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empid` INTEGER NULL,
    `performed_by` INTEGER NULL,
    `action` VARCHAR(191) NULL,
    `timestamp` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_empid_idx`(`empid`),
    INDEX `audit_logs_performed_by_idx`(`performed_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_id` INTEGER NOT NULL,
    `account_holder_name` VARCHAR(191) NOT NULL,
    `bank_name` VARCHAR(191) NOT NULL,
    `branch_name` VARCHAR(191) NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `ifsc_code` VARCHAR(191) NOT NULL,
    `checkbook_document` VARCHAR(191) NULL,

    INDEX `bank_details_employee_id_idx`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `candidates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidate_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `contact_number` VARCHAR(191) NULL,
    `interview_date` DATETIME(3) NULL,
    `interview_time_from` VARCHAR(191) NULL,
    `interview_time_to` VARCHAR(191) NULL,
    `resume` VARCHAR(191) NULL,
    `form_link` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `form_token` VARCHAR(191) NULL,
    `interview_mail_status` VARCHAR(191) NULL DEFAULT 'Not Sent',
    `form_status` VARCHAR(191) NULL DEFAULT 'Mail Not Sent',
    `status` ENUM('Waiting', 'Pending', 'Mail Sent', 'Document Submitted', 'Selected', 'Rejected') NULL DEFAULT 'Waiting',
    `verification` BOOLEAN NULL DEFAULT false,
    `form_submitted` BOOLEAN NOT NULL DEFAULT false,
    `device_info` VARCHAR(191) NULL,
    `ip_address` VARCHAR(191) NULL,
    `token_expiry` DATETIME(3) NULL,
    `token_first_used_at` DATETIME(3) NULL,

    UNIQUE INDEX `candidates_candidate_id_key`(`candidate_id`),
    UNIQUE INDEX `candidates_form_token_key`(`form_token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `compliance_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empid` INTEGER NULL,
    `doc_type` VARCHAR(191) NULL,
    `file_path` VARCHAR(191) NULL,
    `uploaded_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_on` DATETIME(3) NULL,

    INDEX `compliance_documents_empid_idx`(`empid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `compliance_status` (
    `empid` INTEGER NOT NULL,
    `last_updated` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `overall_status` ENUM('Compliant', 'Expiring Soon', 'Non-compliant') NULL,

    PRIMARY KEY (`empid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `empid` INTEGER NOT NULL AUTO_INCREMENT,
    `candidate_id` VARCHAR(191) NULL,
    `main_employee_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `contact_no` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `dob` DATETIME(3) NULL,
    `aadhar_card` VARCHAR(191) NULL,
    `pan_card` VARCHAR(191) NULL,
    `education_certificates` VARCHAR(191) NULL,
    `resume` VARCHAR(191) NULL,
    `experience_certificate` VARCHAR(191) NULL,
    `profile_photo` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `experience_years` INTEGER NULL DEFAULT 0,
    `experience_months` INTEGER NULL DEFAULT 0,
    `aadhar_number` VARCHAR(191) NULL,
    `pan_number` VARCHAR(191) NULL,
    `highest_qualification` VARCHAR(191) NULL,

    UNIQUE INDEX `employees_email_unique`(`email`),
    INDEX `employees_email_idx`(`email`),
    PRIMARY KEY (`empid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `candidate_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidate_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `contact_no` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `dob` DATETIME(3) NULL,
    `aadhar_card` VARCHAR(191) NULL,
    `pan_card` VARCHAR(191) NULL,
    `education_certificates` VARCHAR(191) NULL,
    `resume` VARCHAR(191) NULL,
    `experience_certificate` VARCHAR(191) NULL,
    `profile_photo` VARCHAR(191) NULL,
    `aadhar_number` VARCHAR(191) NULL,
    `pan_number` VARCHAR(191) NULL,
    `highest_qualification` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `candidates_unique_email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `candidates_addresses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidate_id` INTEGER NOT NULL,
    `address_line1` VARCHAR(191) NOT NULL,
    `address_line2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `pincode` VARCHAR(191) NOT NULL,

    INDEX `candidates_addresses_candidate_id_idx`(`candidate_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `candidates_bank_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `candidate_id` INTEGER NOT NULL,
    `account_holder_name` VARCHAR(191) NOT NULL,
    `bank_name` VARCHAR(191) NOT NULL,
    `branch_name` VARCHAR(191) NULL,
    `account_number` VARCHAR(191) NOT NULL,
    `ifsc_code` VARCHAR(191) NOT NULL,
    `checkbook_document` VARCHAR(191) NULL,

    INDEX `candidates_bank_details_candidate_id_idx`(`candidate_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `max_days` INTEGER NOT NULL,
    `paid` BOOLEAN NULL DEFAULT true,
    `type_name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_balances` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empid` VARCHAR(191) NOT NULL,
    `type_id` INTEGER NOT NULL,
    `total` INTEGER NOT NULL,
    `used` INTEGER NULL DEFAULT 0,
    `remaining` INTEGER NULL,

    INDEX `leave_balances_empid_idx`(`empid`),
    INDEX `leave_balances_type_id_idx`(`type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empid` VARCHAR(191) NOT NULL,
    `from_date` DATETIME(3) NOT NULL,
    `to_date` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `applied_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `attachment` VARCHAR(191) NULL,
    `leave_type` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('Pending', 'Approved', 'Rejected') NULL DEFAULT 'Pending',

    INDEX `leave_requests_empid_idx`(`empid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empid` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `contact_number` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `position` VARCHAR(191) NULL,
    `date_of_joining` DATETIME(3) NULL,
    `status` VARCHAR(191) NULL DEFAULT 'Active',
    `experience` INTEGER NULL,
    `profile_photo` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `role` ENUM('hr', 'employee', 'admin', 'ceo', 'superadmin') NOT NULL DEFAULT 'employee',
    `verified` ENUM('verified', 'not verified') NULL DEFAULT 'not verified',
    `form_submitted` BOOLEAN NOT NULL DEFAULT false,
    `resetToken` VARCHAR(191) NULL,
    `resetTokenExpiry` TIMESTAMP(6) NULL,
    `employee_type` ENUM('Full-time', 'Intern', 'Contractor') NULL DEFAULT 'Full-time',
    `candidate_id` VARCHAR(191) NULL,
    `duration_months` INTEGER NULL,

    UNIQUE INDEX `users_empid_key`(`empid`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `empid` VARCHAR(191) NULL,
    `month` VARCHAR(191) NULL,
    `year` INTEGER NULL,
    `basic_salary` DECIMAL(65, 30) NULL,
    `hra` DECIMAL(65, 30) NULL,
    `bonus` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `da` DECIMAL(65, 30) NULL,
    `allowances` DECIMAL(65, 30) NULL,
    `deductions` DECIMAL(65, 30) NULL,
    `net_pay` DECIMAL(65, 30) NULL,
    `generated_on` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `payslip_pdf` VARCHAR(191) NULL,
    `payslip_status` ENUM('pending', 'generated') NULL DEFAULT 'pending',
    `pf` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `ptax` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `esic` DECIMAL(65, 30) NULL DEFAULT 0.00,
    `allowance_details` VARCHAR(191) NULL,
    `deduction_details` VARCHAR(191) NULL,

    INDEX `payroll_empid_idx`(`empid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees_backup` (
    `empid` INTEGER NOT NULL,
    `candidate_id` VARCHAR(50) NULL,
    `name` VARCHAR(100) NULL,
    `email` VARCHAR(100) NULL,
    `contact_no` VARCHAR(15) NULL,
    `password` VARCHAR(100) NULL,
    `address` VARCHAR(191) NULL,
    `gender` VARCHAR(10) NULL,
    `dob` DATE NULL,
    `aadhar_card` VARCHAR(191) NULL,
    `pan_card` VARCHAR(191) NULL,
    `education_certificates` VARCHAR(191) NULL,
    `resume` VARCHAR(191) NULL,
    `experience_certificate` VARCHAR(191) NULL,
    `bank_details` VARCHAR(191) NULL,
    `profile_photo` VARCHAR(191) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`empid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `calendar_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `event_date` DATETIME(3) NOT NULL,
    `event_type` VARCHAR(191) NOT NULL,
    `visible_to` VARCHAR(191) NOT NULL DEFAULT 'all',
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_submissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `created_at` TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assistant_learning` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question` VARCHAR(191) NOT NULL,
    `response` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(255) NULL,
    `intent_category` VARCHAR(100) NULL,
    `intent_labels` VARCHAR(191) NULL,
    `confidence_score` DECIMAL(3, 2) NULL,
    `frequency` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `last_asked` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `assigned_to` VARCHAR(191) NOT NULL,
    `assigned_by` VARCHAR(191) NOT NULL,
    `deadline` DATETIME(3) NOT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'Medium',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `positions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `position_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `created_by` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `positions_created_by_idx`(`created_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`empid`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_empid_fkey` FOREIGN KEY (`empid`) REFERENCES `employees`(`empid`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_performed_by_fkey` FOREIGN KEY (`performed_by`) REFERENCES `employees`(`empid`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `bank_details` ADD CONSTRAINT `bank_details_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`empid`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `compliance_documents` ADD CONSTRAINT `compliance_documents_empid_fkey` FOREIGN KEY (`empid`) REFERENCES `employees`(`empid`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `compliance_status` ADD CONSTRAINT `compliance_status_empid_fkey` FOREIGN KEY (`empid`) REFERENCES `employees`(`empid`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `candidates_addresses` ADD CONSTRAINT `candidates_addresses_candidate_id_fkey` FOREIGN KEY (`candidate_id`) REFERENCES `candidate_details`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `candidates_bank_details` ADD CONSTRAINT `candidates_bank_details_candidate_id_fkey` FOREIGN KEY (`candidate_id`) REFERENCES `candidate_details`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_empid_fkey` FOREIGN KEY (`empid`) REFERENCES `users`(`empid`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `leave_balances` ADD CONSTRAINT `leave_balances_type_id_fkey` FOREIGN KEY (`type_id`) REFERENCES `leave_types`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `leave_requests` ADD CONSTRAINT `leave_requests_empid_fkey` FOREIGN KEY (`empid`) REFERENCES `users`(`empid`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `payroll` ADD CONSTRAINT `payroll_empid_fkey` FOREIGN KEY (`empid`) REFERENCES `users`(`empid`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`empid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`empid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `positions` ADD CONSTRAINT `positions_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`empid`) ON DELETE RESTRICT ON UPDATE CASCADE;
