-- Migration 051: store theme scope and performance metadata
-- Adds desktop/mobile theme grouping and room for Online Store performance cards.

ALTER TABLE store_themes
  ADD COLUMN IF NOT EXISTS device_scope TEXT NOT NULL DEFAULT 'desktop',
  ADD COLUMN IF NOT EXISTS performance_metrics JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_store_themes_device_scope ON store_themes(device_scope);
