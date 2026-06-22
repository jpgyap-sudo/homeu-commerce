-- Migration: fix quotation schema wiring gaps
-- Adds the missing terms, delivery, and pricing columns that the codebase expects on the quotations table.

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS delivery_location TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS project_type TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS grand_total NUMERIC DEFAULT 0;

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms_delivery_leadtime TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms_payment_terms TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms_warranty TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms_bank_details TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms_cancellation_policy TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms_return_policy TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms_rejection_of_items TEXT;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms_refund_policy TEXT;
