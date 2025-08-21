-- AlterTable
ALTER TABLE "bank_details" ADD COLUMN     "checkbook_document_data" BYTEA,
ADD COLUMN     "checkbook_document_filename" TEXT,
ADD COLUMN     "checkbook_document_mimetype" TEXT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "aadhar_card_data" BYTEA,
ADD COLUMN     "aadhar_card_filename" TEXT,
ADD COLUMN     "aadhar_card_mimetype" TEXT,
ADD COLUMN     "education_certificates_data" BYTEA,
ADD COLUMN     "education_certificates_filename" TEXT,
ADD COLUMN     "education_certificates_mimetype" TEXT,
ADD COLUMN     "experience_certificate_data" BYTEA,
ADD COLUMN     "experience_certificate_filename" TEXT,
ADD COLUMN     "experience_certificate_mimetype" TEXT,
ADD COLUMN     "highest_qualification" TEXT,
ADD COLUMN     "pan_card_data" BYTEA,
ADD COLUMN     "pan_card_filename" TEXT,
ADD COLUMN     "pan_card_mimetype" TEXT,
ADD COLUMN     "profile_photo_data" BYTEA,
ADD COLUMN     "profile_photo_filename" TEXT,
ADD COLUMN     "profile_photo_mimetype" TEXT,
ADD COLUMN     "resume_data" BYTEA,
ADD COLUMN     "resume_filename" TEXT,
ADD COLUMN     "resume_mimetype" TEXT;
