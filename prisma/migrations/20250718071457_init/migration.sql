-- CreateEnum
CREATE TYPE "compliance_status_overall_status" AS ENUM ('Compliant', 'Expiring Soon', 'Non-compliant');

-- CreateEnum
CREATE TYPE "leave_types_type_name" AS ENUM ('Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity Leave', 'Unpaid Leave');

-- CreateEnum
CREATE TYPE "leave_requests_status" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "attendance_attendance_status" AS ENUM ('Present', 'Absent');

-- CreateEnum
CREATE TYPE "candidates_status" AS ENUM ('Pending', 'Mail Sent', 'Document Submitted', 'Selected', 'Rejected', 'Waiting');

-- CreateEnum
CREATE TYPE "users_role" AS ENUM ('hr', 'employee', 'admin', 'ceo', 'superadmin');

-- CreateEnum
CREATE TYPE "users_verified" AS ENUM ('verified', 'not verified');

-- CreateEnum
CREATE TYPE "employees_employee_type" AS ENUM ('Full-time', 'Intern', 'Contractor');

-- CreateTable
CREATE TABLE "addresses" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" SERIAL NOT NULL,
    "empid" TEXT NOT NULL,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "total_hours" DECIMAL(65,30),
    "date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "attendance_status" "attendance_attendance_status" DEFAULT 'Absent',

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "empid" INTEGER,
    "performed_by" INTEGER,
    "action" TEXT,
    "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_details" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "branch_name" TEXT,
    "account_number" TEXT NOT NULL,
    "ifsc_code" TEXT NOT NULL,
    "checkbook_document" TEXT,

    CONSTRAINT "bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" SERIAL NOT NULL,
    "candidate_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contact_number" TEXT,
    "interview_date" TIMESTAMP(3),
    "resume" TEXT,
    "form_link" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "form_token" TEXT,
    "interview_mail_status" TEXT DEFAULT 'Not Sent',
    "form_status" TEXT DEFAULT 'Mail Not Sent',
    "status" "candidates_status" DEFAULT 'Pending',
    "verification" BOOLEAN DEFAULT false,
    "form_submitted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_documents" (
    "id" SERIAL NOT NULL,
    "empid" INTEGER,
    "doc_type" TEXT,
    "file_path" TEXT,
    "uploaded_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "expires_on" TIMESTAMP(3),

    CONSTRAINT "compliance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_status" (
    "empid" INTEGER NOT NULL,
    "last_updated" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "overall_status" "compliance_status_overall_status",

    CONSTRAINT "compliance_status_pkey" PRIMARY KEY ("empid")
);

-- CreateTable
CREATE TABLE "employees" (
    "empid" SERIAL NOT NULL,
    "candidate_id" TEXT,
    "name" TEXT,
    "email" TEXT,
    "contact_no" TEXT,
    "password" TEXT,
    "gender" TEXT,
    "dob" TIMESTAMP(3),
    "aadhar_card" TEXT,
    "pan_card" TEXT,
    "education_certificates" TEXT,
    "resume" TEXT,
    "experience_certificate" TEXT,
    "profile_photo" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "experience_years" INTEGER DEFAULT 0,
    "experience_months" INTEGER DEFAULT 0,
    "aadhar_number" TEXT,
    "pan_number" TEXT,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("empid")
);

-- CreateTable
CREATE TABLE "main_employee" (
    "empid" VARCHAR(20) NOT NULL,
    "candidate_id" INTEGER,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) DEFAULT 'employee',
    "name" VARCHAR(100),
    "contact" VARCHAR(15),
    "position" VARCHAR(100),
    "doj" DATE,
    "gender" VARCHAR(10),
    "dob" DATE,
    "address" TEXT,
    "employee_type" VARCHAR(50),
    "experience" VARCHAR(50),
    "profile_photo" VARCHAR(255),
    "aadhar_card" VARCHAR(255),
    "pan_card" VARCHAR(255),
    "education_certificates" TEXT,
    "resume" VARCHAR(255),
    "experience_certificate" VARCHAR(255),
    "bank_details" TEXT,
    "status" VARCHAR(20) DEFAULT 'active',
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "main_employee_pkey" PRIMARY KEY ("empid")
);

-- CreateTable
CREATE TABLE "leave_types" (
    "id" SERIAL NOT NULL,
    "max_days" INTEGER NOT NULL,
    "type_name" "leave_types_type_name" NOT NULL,
    "paid" BOOLEAN DEFAULT true,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" SERIAL NOT NULL,
    "empid" TEXT NOT NULL,
    "type_id" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "used" INTEGER DEFAULT 0,
    "remaining" INTEGER,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" SERIAL NOT NULL,
    "empid" TEXT NOT NULL,
    "from_date" TIMESTAMP(3) NOT NULL,
    "to_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "applied_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "attachment" TEXT,
    "leave_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "leave_requests_status" DEFAULT 'Pending',

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "empid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contact_number" TEXT,
    "password" TEXT NOT NULL,
    "position" TEXT,
    "date_of_joining" TIMESTAMP(3),
    "status" TEXT DEFAULT 'Active',
    "experience" INTEGER,
    "profile_photo" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "role" "users_role" NOT NULL DEFAULT 'employee',
    "verified" "users_verified" DEFAULT 'not verified',
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(6),
    "employee_type" "employees_employee_type" DEFAULT 'Full-time',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" SERIAL NOT NULL,
    "empid" TEXT,
    "month" TEXT,
    "year" INTEGER,
    "basic_salary" DECIMAL(65,30),
    "hra" DECIMAL(65,30),
    "bonus" DECIMAL(65,30) DEFAULT 0.00,
    "da" DECIMAL(65,30),
    "allowances" DECIMAL(65,30),
    "deductions" DECIMAL(65,30),
    "net_pay" DECIMAL(65,30),
    "generated_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "payslip_pdf" TEXT,
    "pf" DECIMAL(65,30) DEFAULT 0.00,
    "ptax" DECIMAL(65,30) DEFAULT 0.00,
    "esic" DECIMAL(65,30) DEFAULT 0.00,

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees_backup" (
    "empid" INTEGER NOT NULL,
    "candidate_id" VARCHAR(50),
    "name" VARCHAR(100),
    "email" VARCHAR(100),
    "contact_no" VARCHAR(15),
    "password" VARCHAR(100),
    "address" TEXT,
    "gender" VARCHAR(10),
    "dob" DATE,
    "aadhar_card" TEXT,
    "pan_card" TEXT,
    "education_certificates" TEXT,
    "resume" TEXT,
    "experience_certificate" TEXT,
    "bank_details" TEXT,
    "profile_photo" TEXT,
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_backup_pkey" PRIMARY KEY ("empid")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "addresses_employee_id_idx" ON "addresses"("employee_id");

-- CreateIndex
CREATE INDEX "audit_logs_empid_idx" ON "audit_logs"("empid");

-- CreateIndex
CREATE INDEX "audit_logs_performed_by_idx" ON "audit_logs"("performed_by");

-- CreateIndex
CREATE INDEX "bank_details_employee_id_idx" ON "bank_details"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_candidate_id_key" ON "candidates"("candidate_id");

-- CreateIndex
CREATE INDEX "compliance_documents_empid_idx" ON "compliance_documents"("empid");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_unique" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_email_idx" ON "employees"("email");

-- CreateIndex
CREATE INDEX "leave_balances_empid_idx" ON "leave_balances"("empid");

-- CreateIndex
CREATE INDEX "leave_balances_type_id_idx" ON "leave_balances"("type_id");

-- CreateIndex
CREATE INDEX "leave_requests_empid_idx" ON "leave_requests"("empid");

-- CreateIndex
CREATE UNIQUE INDEX "users_empid_key" ON "users"("empid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "payroll_empid_idx" ON "payroll"("empid");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("empid") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_empid_fkey" FOREIGN KEY ("empid") REFERENCES "employees"("empid") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "employees"("empid") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "bank_details" ADD CONSTRAINT "bank_details_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("empid") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "compliance_documents" ADD CONSTRAINT "compliance_documents_empid_fkey" FOREIGN KEY ("empid") REFERENCES "employees"("empid") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "compliance_status" ADD CONSTRAINT "compliance_status_empid_fkey" FOREIGN KEY ("empid") REFERENCES "employees"("empid") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_empid_fkey" FOREIGN KEY ("empid") REFERENCES "users"("empid") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_empid_fkey" FOREIGN KEY ("empid") REFERENCES "users"("empid") ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_empid_fkey" FOREIGN KEY ("empid") REFERENCES "users"("empid") ON DELETE RESTRICT ON UPDATE RESTRICT;
