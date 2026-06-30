-- Migration 052: mobile live theme role
-- Allows one active mobile storefront snapshot separate from the desktop live theme.

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_themes_one_mobile_live
ON store_themes ((role))
WHERE role = 'mobile_live';
