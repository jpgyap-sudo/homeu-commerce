-- Migration: add product fields — short_description, tags, colors, related_products
-- Created: 2026-06-19T13:58:00+08:00

-- Extended text fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT[] DEFAULT '{}';

-- Indexes for tag/color search
CREATE INDEX IF NOT EXISTS products_tags_idx ON products USING GIN(tags);
CREATE INDEX IF NOT EXISTS products_colors_idx ON products USING GIN(colors);

-- Related products (many-to-many, self-referencing)
CREATE TABLE IF NOT EXISTS related_products (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, related_product_id)
);

CREATE INDEX IF NOT EXISTS related_products_product_id_idx ON related_products(product_id);
CREATE INDEX IF NOT EXISTS related_products_related_id_idx ON related_products(related_product_id);
