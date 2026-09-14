-- Replace the unused employee-linked invoices leftover from init
-- with customer invoices that are independent of payroll.

ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_employee_id_fkey";
DROP INDEX IF EXISTS "invoices_employee_id_idx";
DROP INDEX IF EXISTS "invoices_status_idx";
DROP INDEX IF EXISTS "invoices_invoice_year_invoice_month_idx";
DROP INDEX IF EXISTS "invoices_invoice_number_key";
DROP TABLE IF EXISTS "invoices";
DROP TYPE IF EXISTS "InvoiceStatus";

CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED');

CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "customer_address" TEXT,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_invoice_date_idx" ON "invoices"("invoice_date");
CREATE INDEX "invoices_due_date_idx" ON "invoices"("due_date");
CREATE INDEX "invoices_customer_name_idx" ON "invoices"("customer_name");
CREATE INDEX "invoices_created_at_idx" ON "invoices"("created_at");
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
