-- Migration 032: "theme_templates"
-- Add template column to homepage_sections and seed product/collection templates

ALTER TABLE homepage_sections ADD COLUMN IF NOT EXISTS template VARCHAR NOT NULL DEFAULT 'index';

CREATE INDEX IF NOT EXISTS idx_homepage_sections_template ON homepage_sections(template);

-- Seed default sections for the Product Details template if none exist
INSERT INTO homepage_sections (type, position, enabled, config, template)
SELECT 'product_details', 10, true, '{}'::jsonb, 'product'
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections WHERE template = 'product');

INSERT INTO homepage_sections (type, position, enabled, config, template)
SELECT 'featured_products', 20, true, '{"heading": "You May Also Like", "limit": 4}'::jsonb, 'product'
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections WHERE template = 'product' AND type = 'featured_products');

-- Seed default sections for the Collection/Catalog template if none exist
INSERT INTO homepage_sections (type, position, enabled, config, template)
SELECT 'collection_header', 10, true, '{}'::jsonb, 'collection'
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections WHERE template = 'collection');

INSERT INTO homepage_sections (type, position, enabled, config, template)
SELECT 'product_grid', 20, true, '{"columns": 4, "pageSize": 24}'::jsonb, 'collection'
WHERE NOT EXISTS (SELECT 1 FROM homepage_sections WHERE template = 'collection' AND type = 'product_grid');
