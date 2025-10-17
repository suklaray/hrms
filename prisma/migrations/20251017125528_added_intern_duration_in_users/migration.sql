/*
  Warnings:

  - You are about to drop the column `duration_months` on the `employees` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "employees" DROP COLUMN "duration_months";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "candidate_id" TEXT,
ADD COLUMN     "duration_months" INTEGER;
