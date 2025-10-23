-- CreateEnum
CREATE TYPE "payslip_status" AS ENUM ('pending', 'generated');

-- AlterTable
ALTER TABLE "payroll" ADD COLUMN     "payslip_status" "payslip_status" DEFAULT 'pending';
