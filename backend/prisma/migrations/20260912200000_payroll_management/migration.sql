-- CreateEnum
CREATE TYPE "PayrollPaymentStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AppSettingKey" ADD VALUE 'PAYROLL_WORKING_DAYS_PER_MONTH';

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "payroll_month" INTEGER NOT NULL,
    "payroll_year" INTEGER NOT NULL,
    "basic_salary" DECIMAL(12,2) NOT NULL,
    "allowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overtime_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unpaid_leave_deduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unpaid_leave_days" INTEGER NOT NULL DEFAULT 0,
    "gross_salary" DECIMAL(12,2) NOT NULL,
    "net_salary" DECIMAL(12,2) NOT NULL,
    "payment_status" "PayrollPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payroll_records_employee_id_payroll_month_payroll_year_key" ON "payroll_records"("employee_id", "payroll_month", "payroll_year");

-- CreateIndex
CREATE INDEX "payroll_records_employee_id_idx" ON "payroll_records"("employee_id");

-- CreateIndex
CREATE INDEX "payroll_records_payroll_year_payroll_month_idx" ON "payroll_records"("payroll_year", "payroll_month");

-- CreateIndex
CREATE INDEX "payroll_records_payment_status_idx" ON "payroll_records"("payment_status");

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
