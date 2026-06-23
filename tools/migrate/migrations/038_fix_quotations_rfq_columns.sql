-- Fix database drift for the quotations table on production VPS.
-- Adds columns rfq_id, pending_revision, and revision_request if they do not exist.

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS rfq_id INTEGER REFERENCES rfq_requests(id),
  ADD COLUMN IF NOT EXISTS pending_revision BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS revision_request TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_quotations_rfq_id ON quotations(rfq_id);
