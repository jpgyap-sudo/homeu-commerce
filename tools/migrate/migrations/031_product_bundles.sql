-- Product bundles — "Buy these products together and get a discount!"
-- Admin configures one (or more) bundle partners per product; the storefront
-- product page shows the configured partner + quantity + bundle discount
-- exactly like the classic "Frequently Bought Together" widget.

CREATE TABLE IF NOT EXISTS product_bundles (
  id                  SERIAL PRIMARY KEY,
  product_id          INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  bundled_product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  bundled_variant_id  INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  bundled_quantity    INTEGER NOT NULL DEFAULT 1,
  discount_type       VARCHAR NOT NULL DEFAULT 'percent', -- 'percent' | 'fixed'
  discount_value      NUMERIC NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  active              BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_bundles_distinct_products CHECK (product_id <> bundled_product_id),
  CONSTRAINT product_bundles_unique UNIQUE (product_id, bundled_product_id)
);

CREATE INDEX IF NOT EXISTS product_bundles_product_idx ON product_bundles(product_id);
CREATE INDEX IF NOT EXISTS product_bundles_bundled_product_idx ON product_bundles(bundled_product_id);
