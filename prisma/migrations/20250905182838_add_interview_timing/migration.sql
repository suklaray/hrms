/*
  Warnings:

  - You are about to drop the column `checkbook_document_data` on the `bank_details` table. All the data in the column will be lost.
  - You are about to drop the column `checkbook_document_filename` on the `bank_details` table. All the data in the column will be lost.
  - You are about to drop the column `checkbook_document_mimetype` on the `bank_details` table. All the data in the column will be lost.
  - You are about to drop the column `resume_data` on the `candidates` table. All the data in the column will be lost.
  - You are about to drop the column `resume_filename` on the `candidates` table. All the data in the column will be lost.
  - You are about to drop the column `resume_mimetype` on the `candidates` table. All the data in the column will be lost.
  - You are about to drop the column `aadhar_card_data` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `aadhar_card_filename` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `aadhar_card_mimetype` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `education_certificates_data` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `education_certificates_filename` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `education_certificates_mimetype` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `experience_certificate_data` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `experience_certificate_filename` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `experience_certificate_mimetype` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `pan_card_data` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `pan_card_filename` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `pan_card_mimetype` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `profile_photo_data` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `profile_photo_filename` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `profile_photo_mimetype` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `resume_data` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `resume_filename` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `resume_mimetype` on the `employees` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bank_details" DROP COLUMN "checkbook_document_data",
DROP COLUMN "checkbook_document_filename",
DROP COLUMN "checkbook_document_mimetype";

-- AlterTable
ALTER TABLE "candidates" DROP COLUMN "resume_data",
DROP COLUMN "resume_filename",
DROP COLUMN "resume_mimetype",
ADD COLUMN     "interview_timing" TEXT;

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "aadhar_card_data",
DROP COLUMN "aadhar_card_filename",
DROP COLUMN "aadhar_card_mimetype",
DROP COLUMN "education_certificates_data",
DROP COLUMN "education_certificates_filename",
DROP COLUMN "education_certificates_mimetype",
DROP COLUMN "experience_certificate_data",
DROP COLUMN "experience_certificate_filename",
DROP COLUMN "experience_certificate_mimetype",
DROP COLUMN "pan_card_data",
DROP COLUMN "pan_card_filename",
DROP COLUMN "pan_card_mimetype",
DROP COLUMN "profile_photo_data",
DROP COLUMN "profile_photo_filename",
DROP COLUMN "profile_photo_mimetype",
DROP COLUMN "resume_data",
DROP COLUMN "resume_filename",
DROP COLUMN "resume_mimetype";

-- AlterTable
ALTER TABLE "payroll" ADD COLUMN     "allowance_details" TEXT,
ADD COLUMN     "deduction_details" TEXT;
