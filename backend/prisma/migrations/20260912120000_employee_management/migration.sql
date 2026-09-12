-- AlterEnum
ALTER TYPE "EmployeeStatus" ADD VALUE 'TERMINATED';
ALTER TYPE "EmployeeStatus" ADD VALUE 'ON_LEAVE';

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- AlterTable
ALTER TABLE "employees" ADD COLUMN "alternate_phone" TEXT;
ALTER TABLE "employees" ADD COLUMN "date_of_birth" DATE;
ALTER TABLE "employees" ADD COLUMN "gender" "Gender";
ALTER TABLE "employees" ADD COLUMN "address" TEXT;
ALTER TABLE "employees" ADD COLUMN "profile_image_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_first_name_idx" ON "employees"("first_name");

-- CreateIndex
CREATE INDEX "employees_phone_idx" ON "employees"("phone");

-- CreateIndex
CREATE INDEX "employees_position_idx" ON "employees"("position");
