-- Migration: add inventory_tracked, inventory_quantity, sales_channel to products
-- Created: 2026-06-20
--
-- The admin product edit/new forms have sent these fields for a while, but the
-- columns were never created — every PATCH /api/products/[id] that touched them
-- threw "column does not exist" (caught and surfaced as a 500). Idempotent.

ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_tracked BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sales_channel VARCHAR DEFAULT 'online-store';
