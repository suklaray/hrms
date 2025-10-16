/*
  Warnings:

  - A unique constraint covering the columns `[form_token]` on the table `candidates` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "device_info" TEXT,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "token_expiry" TIMESTAMP(3),
ADD COLUMN     "token_first_used_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "candidates_form_token_key" ON "candidates"("form_token");
