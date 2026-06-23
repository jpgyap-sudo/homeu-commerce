-- Closes a data-loss gap: the chatbot RFQ submission flow
-- (lib/chatbot/rfq-service.ts submitRFQ) already collects targetDate,
-- budgetRange, and per-item acceptsAlternatives from the customer, but
-- rfq_requests / rfq_request_items had no columns to persist them, so the
-- admin RFQ detail page always rendered them blank/wrong.
--
-- target_date is TEXT, not DATE — the AI chat captures free-form answers
-- like "next month" or "ASAP", not always a strict calendar date.

ALTER TABLE rfq_requests
  ADD COLUMN IF NOT EXISTS target_date TEXT,
  ADD COLUMN IF NOT EXISTS budget_range TEXT;

ALTER TABLE rfq_request_items
  ADD COLUMN IF NOT EXISTS accepts_alternatives BOOLEAN NOT NULL DEFAULT true;
