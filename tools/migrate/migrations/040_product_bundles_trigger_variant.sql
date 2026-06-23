-- Variant-tiered product bundles, mirroring the original homeu.ph "Bundler"
-- app: a table can have multiple bundle offers, each tied to a specific
-- size/seat-count variant of the table (e.g. 6-seater pairs with 6 chairs,
-- 10-seater pairs with 10 chairs). trigger_variant_id = NULL means the
-- bundle applies regardless of which variant the shopper has selected.

ALTER TABLE product_bundles
  ADD COLUMN IF NOT EXISTS trigger_variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS product_bundles_trigger_variant_idx ON product_bundles(trigger_variant_id);

ALTER TABLE product_bundles DROP CONSTRAINT IF EXISTS product_bundles_unique;

-- One bundle row per (product, bundled product, trigger variant) — NULL
-- trigger_variant_id is coalesced to 0 so there's still only one "any
-- variant" catch-all row per product/bundled-product pair.
CREATE UNIQUE INDEX IF NOT EXISTS product_bundles_unique_idx
  ON product_bundles(product_id, bundled_product_id, COALESCE(trigger_variant_id, 0));
