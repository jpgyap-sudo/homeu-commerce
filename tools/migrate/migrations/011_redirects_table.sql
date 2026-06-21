-- Migration: create redirects table (production was missing it entirely —
-- the whole Redirects admin feature 500'd on every request there).
-- Uses plain VARCHAR instead of replicating local's custom Postgres enum
-- types (enum_redirects_status etc.) — the application only ever reads/
-- writes plain strings, so this is functionally equivalent and simpler.
-- Idempotent.

CREATE TABLE IF NOT EXISTS redirects (
  id SERIAL PRIMARY KEY,
  source VARCHAR NOT NULL,
  target VARCHAR NOT NULL,
  type VARCHAR DEFAULT '301',
  status VARCHAR DEFAULT 'pending',
  source_type VARCHAR DEFAULT 'manual',
  notes VARCHAR,
  priority VARCHAR DEFAULT 'medium',
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS redirects_source_idx ON redirects(source);
CREATE INDEX IF NOT EXISTS redirects_created_at_idx ON redirects(created_at);
CREATE INDEX IF NOT EXISTS redirects_updated_at_idx ON redirects(updated_at);
