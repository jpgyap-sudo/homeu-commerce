-- 028_customer_tags.sql
-- Adds tags array column to customers table for categorization.
-- Backfills 'designer' tag for existing designers.

BEGIN;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Backfill 'designer' tag for customers linked to designer_club_applications
UPDATE customers c
SET tags = array_append(COALESCE(tags, '{}'), 'designer')
WHERE EXISTS (SELECT 1 FROM designer_club_applications d WHERE LOWER(d.email) = LOWER(c.email))
  AND (c.tags IS NULL OR NOT (c.tags @> ARRAY['designer']));

CREATE INDEX IF NOT EXISTS idx_customers_tags ON customers USING GIN(tags);

COMMIT;
