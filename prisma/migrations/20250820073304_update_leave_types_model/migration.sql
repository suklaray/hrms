/*
  Warnings:

  - Changed the type of `type_name` on the `leave_types` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "leave_types" DROP COLUMN "type_name",
ADD COLUMN     "type_name" TEXT NOT NULL;

-- DropEnum
DROP TYPE "leave_types_type_name";
