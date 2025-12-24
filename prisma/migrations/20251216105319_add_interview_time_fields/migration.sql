/*
  Warnings:

  - You are about to drop the column `interview_timing` on the `candidates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "candidates" DROP COLUMN "interview_timing",
ADD COLUMN     "interview_time_from" TEXT,
ADD COLUMN     "interview_time_to" TEXT;
