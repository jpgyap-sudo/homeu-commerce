-- Migration 053: product_images table
-- The product_images table was referenced in 34+ places across the codebase
-- but never had a migration. It only existed via inline CREATE TABLE IF NOT EXISTS
-- in route handlers or was assumed to exist from the PayloadCMS era.

CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
