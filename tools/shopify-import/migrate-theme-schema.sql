-- Theme system: section-based homepage + global site settings.
-- The homepage becomes an ordered list of typed sections (config in JSONB),
-- rendered by the storefront and editable in /admin/theme.
SET client_min_messages TO WARNING;
BEGIN;

-- ── Global key/value settings (logo, colors, social, announcement…) ────
CREATE TABLE IF NOT EXISTS site_settings (
  key        VARCHAR PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Ordered homepage sections ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS homepage_sections (
  id         SERIAL PRIMARY KEY,
  type       VARCHAR NOT NULL,                  -- slideshow|brand_text|collection_grid|image_with_text|image_bar|featured_products|reviews|instagram|cta
  position   INTEGER NOT NULL DEFAULT 0,
  enabled    BOOLEAN NOT NULL DEFAULT true,
  config     JSONB   NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS homepage_sections_position_idx ON homepage_sections(position);

-- ── Seed homepage sections from the current hardcoded layout ────────────
-- Only seed if empty (idempotent).
INSERT INTO homepage_sections (type, position, enabled, config)
SELECT * FROM (VALUES
  ('slideshow', 10, true, '{
     "slides": [
       {"image":"https://cdn.shopify.com/s/files/1/0559/7377/3476/files/Picture5_e00bd4c4-58c8-4b53-a4ad-8d43d94314ca.jpg?v=1618751639","heading":"Modern Living, Curated","subheading":"Contemporary furniture & lighting","buttonText":"Shop Sofa","buttonLink":"/products?category=seating"},
       {"image":"https://cdn.shopify.com/s/files/1/0559/7377/3476/files/Picture20.jpg?v=1618749610","heading":"Designed to Last","subheading":"Timeless pieces for every room","buttonText":"Shop Seating","buttonLink":"/products?category=seating"},
       {"image":"https://cdn.shopify.com/s/files/1/0559/7377/3476/files/Picture21.jpg?v=1618749947","heading":"Statement Tables","subheading":"Centerpieces for modern interiors","buttonText":"Shop Tables","buttonLink":"/products?category=furniture"}
     ]
   }'::jsonb),
  ('brand_text', 20, true, '{
     "title":"HOME ATELIER",
     "body":"We love to collect and put together different interior pieces for home lovers. Good taste is our guide. We believe in timeless design made of true quality and personalization. We offer an accurate and customized customer care and a comprehensive catalog ranging from kitchen to living, from home to hospitality, from furnishings to lighting solutions."
   }'::jsonb),
  ('collection_grid', 30, true, '{
     "heading":"Shop by Collection",
     "source":"featured",
     "limit":15
   }'::jsonb),
  ('image_with_text', 40, true, '{
     "image":"https://cdn.shopify.com/s/files/1/0559/7377/3476/files/Picture5_e00bd4c4-58c8-4b53-a4ad-8d43d94314ca.jpg?v=1618751639",
     "title":"Mix and match wall panels",
     "text":"WPC wall panels offer premium aesthetics and durability. Water-resistant, eco-friendly, and available in a wide range of textures — perfect for accent walls, home offices, and commercial spaces.",
     "buttonText":"Shop Wall Panels",
     "buttonLink":"/products?category=wall-panels"
   }'::jsonb),
  ('image_bar', 50, true, '{
     "images":[
       {"image":"https://cdn.shopify.com/s/files/1/0559/7377/3476/files/Picture21.jpg?v=1618749947","link":""},
       {"image":"https://cdn.shopify.com/s/files/1/0559/7377/3476/files/Picture20.jpg?v=1618749610","link":""},
       {"image":"https://cdn.shopify.com/s/files/1/0559/7377/3476/files/Picture22.jpg?v=1618751994","link":""}
     ]
   }'::jsonb),
  ('featured_products', 60, true, '{
     "heading":"More Featured Pieces",
     "source":"auto",
     "collectionSlug":"",
     "limit":12
   }'::jsonb),
  ('reviews', 70, true, '{"heading":"What Our Customers Say"}'::jsonb),
  ('instagram', 80, true, '{"heading":"Follow @homeatelierph","handle":"homeatelierph","tiles":6}'::jsonb),
  ('cta', 90, true, '{
     "heading":"Trade & Bulk Enquiries",
     "text":"Are you an interior designer, architect, or developer? Join our Designer Club for exclusive pricing and priority service.",
     "primaryText":"Join Designer Club","primaryLink":"/pages/designerclub",
     "secondaryText":"Request a Quote","secondaryLink":"/quote-cart"
   }'::jsonb)
) AS seed(type, position, enabled, config)
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections);

COMMIT;

SELECT id, type, position, enabled FROM homepage_sections ORDER BY position;
