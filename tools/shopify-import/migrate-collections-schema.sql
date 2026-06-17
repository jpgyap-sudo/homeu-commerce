-- Upgrade `categories` into full Shopify-style Collections (in place)
-- Adds smart-rule + manual-pick + many-to-many capability.
-- Backwards compatible: products.category_id keeps working.
SET client_min_messages TO WARNING;
BEGIN;

-- ── Collection capabilities on categories ──────────────────────────────
ALTER TABLE categories ADD COLUMN IF NOT EXISTS collection_type VARCHAR NOT NULL DEFAULT 'manual';  -- 'manual' | 'smart'
ALTER TABLE categories ADD COLUMN IF NOT EXISTS rules JSONB NOT NULL DEFAULT '[]'::jsonb;            -- [{column,relation,condition}]
ALTER TABLE categories ADD COLUMN IF NOT EXISTS rules_match VARCHAR NOT NULL DEFAULT 'all';          -- 'all' | 'any'  (Shopify appliedDisjunctively=any)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;                 -- display/homepage order
ALTER TABLE categories ADD COLUMN IF NOT EXISTS product_sort VARCHAR NOT NULL DEFAULT 'manual';      -- manual|best-selling|price-asc|price-desc|title-asc|title-desc|created-desc
ALTER TABLE categories ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;             -- show on homepage "Shop by Collection"

-- ── product_type for smart rules (Shopify TYPE column parity) ───────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR;

-- ── Many-to-many junction ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collection_products (
  collection_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  product_id    INTEGER NOT NULL REFERENCES products(id)   ON DELETE CASCADE,
  position      INTEGER NOT NULL DEFAULT 0,
  source        VARCHAR NOT NULL DEFAULT 'manual',  -- 'manual' | 'smart' (how it was added)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, product_id)
);
CREATE INDEX IF NOT EXISTS collection_products_collection_idx ON collection_products(collection_id, position);
CREATE INDEX IF NOT EXISTS collection_products_product_idx ON collection_products(product_id);

-- ── Seed junction from existing single category_id links ────────────────
-- Every product already pinned to a category becomes a manual member.
INSERT INTO collection_products (collection_id, product_id, position, source)
SELECT p.category_id, p.id, p.id, 'manual'
FROM products p
WHERE p.category_id IS NOT NULL
ON CONFLICT (collection_id, product_id) DO NOTHING;

COMMIT;

-- ── Verification ────────────────────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM categories) AS collections,
  (SELECT COUNT(*) FROM collection_products) AS membership_links,
  (SELECT COUNT(DISTINCT collection_id) FROM collection_products) AS collections_with_products;
