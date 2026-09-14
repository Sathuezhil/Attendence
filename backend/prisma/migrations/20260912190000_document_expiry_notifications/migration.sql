-- AlterEnum
ALTER TYPE "AppSettingKey" ADD VALUE 'DOCUMENT_EXPIRY_URGENT_DAYS';

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'DOCUMENT_EXPIRING',
  'DOCUMENT_EXPIRED',
  'LEAVE_APPROVED',
  'LEAVE_REJECTED',
  'ATTENDANCE_ALERT'
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "employee_id" TEXT,
    "document_id" TEXT,
    "event_key" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_event_key_key" ON "notifications"("event_key");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "notifications_employee_id_idx" ON "notifications"("employee_id");

-- CreateIndex
CREATE INDEX "notifications_document_id_idx" ON "notifications"("document_id");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
