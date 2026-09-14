-- Allow a deleted employee's code and email to be used again.

DROP INDEX IF EXISTS "employees_employee_code_key";
CREATE UNIQUE INDEX "employees_employee_code_active_key" ON "employees"("employee_code") WHERE "deleted_at" IS NULL;

DROP INDEX IF EXISTS "employees_email_key";
CREATE UNIQUE INDEX "employees_email_active_key" ON "employees"("email") WHERE "deleted_at" IS NULL;
