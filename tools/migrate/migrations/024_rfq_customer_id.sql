-- 023_rfq_customer_id.sql
-- Ensures rfq_requests has the customer_id column needed by /api/rfq.
-- Previous migration 003_add_rfq_columns.sql had this but was never run.

BEGIN;

ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS quotation_sent_at TIMESTAMPTZ;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS quotation_sent_via TEXT DEFAULT '';
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS quotation_notes TEXT DEFAULT '';
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS closed_reason TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_rfq_requests_customer_id ON rfq_requests (customer_id);

COMMIT;
