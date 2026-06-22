-- Product variants — products like "Linea Modern Sofa" sell as multiple
-- selectable models (Armchair / Two-seater / Three-seater / Four-seater),
-- each with its own price, imported 1:1 from the original Shopify variants.
-- products.price/sale_price remain the "from" price shown on cards/listings
-- (kept as the lowest variant price by the importer); the product detail
-- page shows the selected variant's own price once a variant is chosen.

CREATE TABLE IF NOT EXISTS product_variants (
  id                  SERIAL PRIMARY KEY,
  product_id          INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title               VARCHAR NOT NULL,
  sku                 VARCHAR,
  price               NUMERIC NOT NULL,
  sale_price          NUMERIC,
  inventory_quantity  INTEGER DEFAULT 0,
  shopify_variant_id  VARCHAR,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_default          BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_variants_product_idx ON product_variants(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_shopify_id_idx ON product_variants(shopify_variant_id) WHERE shopify_variant_id IS NOT NULL;
