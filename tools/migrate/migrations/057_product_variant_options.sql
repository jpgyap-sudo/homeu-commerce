-- Migration 057: Product variant multi-option support
-- Adds option columns for multi-attribute variants (e.g. Color × Size × Material)

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS option1_title TEXT DEFAULT '';
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS option1_value TEXT DEFAULT '';
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS option2_title TEXT DEFAULT '';
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS option2_value TEXT DEFAULT '';
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS option3_title TEXT DEFAULT '';
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS option3_value TEXT DEFAULT '';
