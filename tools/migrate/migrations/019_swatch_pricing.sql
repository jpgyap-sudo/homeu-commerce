-- Migration 019: Hide price on fabric/stone swatch samples.
--
-- Stone Options (sintered-stone, natural-stone, veratti-sinteredstone) and
-- Finish Materials (fabric-swatches-linen/velvet/leather/leatherette,
-- swatches-tech-cloth) are all tag-driven smart collections that share one
-- common tag: "swatch" (see apps/website/src/data/category-rules.json).
-- These are physical material samples, not priced standalone products —
-- hide their price on the storefront via the existing products.show_price
-- column (already read by the product detail page; the listing grid was
-- wired to it in the same change that added this migration).

UPDATE products SET show_price = false WHERE tags @> '["swatch"]'::jsonb;
