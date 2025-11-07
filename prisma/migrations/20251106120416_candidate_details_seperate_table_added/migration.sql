/*
  Warnings:

  - You are about to drop the `main_employee` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "main_employee";

-- CreateTable
CREATE TABLE "candidate_details" (
    "id" SERIAL NOT NULL,
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
    "aadhar_number" TEXT,
    "pan_number" TEXT,
    "highest_qualification" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates_addresses" (
    "id" SERIAL NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "address_line1" TEXT NOT NULL,
    "address_line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,

    CONSTRAINT "candidates_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidates_bank_details" (
    "id" SERIAL NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "branch_name" TEXT,
    "account_number" TEXT NOT NULL,
    "ifsc_code" TEXT NOT NULL,
    "checkbook_document" TEXT,

    CONSTRAINT "candidates_bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidates_unique_email" ON "candidate_details"("email");

-- CreateIndex
CREATE INDEX "candidates_addresses_candidate_id_idx" ON "candidates_addresses"("candidate_id");

-- CreateIndex
CREATE INDEX "candidates_bank_details_candidate_id_idx" ON "candidates_bank_details"("candidate_id");

-- AddForeignKey
ALTER TABLE "candidates_addresses" ADD CONSTRAINT "candidates_addresses_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidates_bank_details" ADD CONSTRAINT "candidates_bank_details_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
