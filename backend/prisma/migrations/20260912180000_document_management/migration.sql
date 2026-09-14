-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'PASSPORT';
ALTER TYPE "DocumentType" ADD VALUE 'VISA';
ALTER TYPE "DocumentType" ADD VALUE 'EMIRATES_ID';
ALTER TYPE "DocumentType" ADD VALUE 'WORK_PERMIT';
ALTER TYPE "DocumentType" ADD VALUE 'LABOUR_CONTRACT';
ALTER TYPE "DocumentType" ADD VALUE 'INSURANCE';

-- AlterEnum
ALTER TYPE "AppSettingKey" ADD VALUE 'DOCUMENT_EXPIRY_WARNING_DAYS';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "document_number" TEXT;
ALTER TABLE "documents" ADD COLUMN "issue_date" DATE;
ALTER TABLE "documents" ADD COLUMN "expiry_date" DATE;
ALTER TABLE "documents" ADD COLUMN "notes" TEXT;

-- CreateIndex
CREATE INDEX "documents_expiry_date_idx" ON "documents"("expiry_date");
