-- Migration: add missing RFQ columns for GAP-CRIT-003
-- Created: 2026-06-20
--
-- The codebase references "rfq_request_items" but only "rfq_requests_items"
-- (PayloadCMS naming) exists in the schema. This migration creates the table
-- that the application code actually uses, plus ensures all columns exist
-- on rfq_requests.

-- ── Create rfq_request_items table (referenced by /api/rfq route) ──
CREATE TABLE IF NOT EXISTS rfq_request_items (
  id SERIAL PRIMARY KEY,
  rfq_request_id INTEGER NOT NULL REFERENCES rfq_requests(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_title_snapshot TEXT DEFAULT '',
  sku_snapshot TEXT DEFAULT '',
  unit_price_snapshot NUMERIC DEFAULT 0,
  quantity NUMERIC DEFAULT 1 NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── rfq_requests: ensure all columns exist ──
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS quotation_sent_at TIMESTAMPTZ;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS quotation_sent_via TEXT DEFAULT '';
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS quotation_notes TEXT DEFAULT '';
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS closed_reason TEXT DEFAULT '';

-- ── Indexes for performance ──
CREATE INDEX IF NOT EXISTS idx_rfq_requests_customer_id ON rfq_requests (customer_id);
CREATE INDEX IF NOT EXISTS idx_rfq_request_items_rfq_id ON rfq_request_items (rfq_request_id);
