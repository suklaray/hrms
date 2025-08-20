-- AlterTable
ALTER TABLE "candidates" ADD COLUMN     "resume_data" BYTEA,
ADD COLUMN     "resume_filename" TEXT,
ADD COLUMN     "resume_mimetype" TEXT;
