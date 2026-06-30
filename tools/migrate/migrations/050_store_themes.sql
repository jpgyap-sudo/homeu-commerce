-- Migration 050: store themes
-- Adds Shopify-style theme library records for DaVinciOS Online Store.

CREATE TABLE IF NOT EXISTS store_themes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'unpublished',
  version TEXT NOT NULL DEFAULT '1.0.0',
  source_theme_id INTEGER REFERENCES store_themes(id) ON DELETE SET NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  duplicated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_store_themes_role ON store_themes(role);
CREATE INDEX IF NOT EXISTS idx_store_themes_updated_at ON store_themes(updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_themes_one_live
ON store_themes ((role))
WHERE role = 'live';
