-- Drop employee address and department.

DROP INDEX IF EXISTS "employees_department_idx";

ALTER TABLE "employees" DROP COLUMN IF EXISTS "address";
ALTER TABLE "employees" DROP COLUMN IF EXISTS "department";
