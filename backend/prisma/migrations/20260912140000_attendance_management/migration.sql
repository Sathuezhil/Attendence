-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'LATE';
ALTER TYPE "AttendanceStatus" ADD VALUE 'HALF_DAY';
ALTER TYPE "AttendanceStatus" ADD VALUE 'ON_LEAVE';

-- AlterEnum
ALTER TYPE "AppSettingKey" ADD VALUE 'ATTENDANCE_HOURS';

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN "late_minutes" INTEGER;
ALTER TABLE "attendances" ADD COLUMN "working_minutes" INTEGER;

-- CreateIndex
CREATE INDEX "attendances_employee_id_idx" ON "attendances"("employee_id");
