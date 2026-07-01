-- Migration: quotation revision system tables
-- Creates tables needed for the frictionless quotation revision workflow:
--   1. quotation_revision_items — structured per-item revision actions
--   2. quotation_revision_chat — mini revision chat thread per quotation
--   3. Add 'revised' status to quotations status check + pending_revision_data column

-- ── 1. Structured Revision Items ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotation_revision_items (
  id          SERIAL PRIMARY KEY,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_index  INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'remove', 'change_qty', 'change_finish', 'swap', 'lower_price', 'lead_time'
  )),
  payload     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qri_quotation ON quotation_revision_items(quotation_id);

-- ── 2. Revision Chat Thread ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotation_revision_chat (
  id          SERIAL PRIMARY KEY,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin', 'system')),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qrc_quotation ON quotation_revision_chat(quotation_id);

-- ── 3. Add pending_revision_data for structured revision storage ─────
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS pending_revision_data JSONB DEFAULT '{}';

-- Note: 'revised' status is handled at the application level — the
-- quotations table uses a TEXT status column, not an enum.
