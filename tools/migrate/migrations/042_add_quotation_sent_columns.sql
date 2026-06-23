-- Migration: add_quotation_sent_columns
-- Created: 2026-06-23
-- Add sent_at and sent_via columns to the quotations table to support tracking when and how they were sent.

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_via VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_quotations_sent_at ON quotations(sent_at);
