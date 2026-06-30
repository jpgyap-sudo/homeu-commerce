-- Migration 059: Import email-less designer club customers
--
-- Some Shopify designer-tagged customers were skipped during import
-- because they had no email (the dedup key). This migration backfills
-- placeholder emails using contact number or a generated identifier
-- so they can be managed through the admin panel.

DO $$
DECLARE
  c RECORD;
  placeholder_email TEXT;
BEGIN
  FOR c IN
    SELECT id, first_name, last_name, contact_number, email
    FROM designer_club_applications
    WHERE (email IS NULL OR email = '')
      AND customer_id IS NULL
  LOOP
    -- Use contact number if available, otherwise generate UUID-based placeholder
    IF c.contact_number IS NOT NULL AND c.contact_number != '' THEN
      placeholder_email := LOWER(REPLACE(REPLACE(c.contact_number, '+', ''), ' ', '')) || '@placeholder.homeatelier.ph';
    ELSE
      placeholder_email := 'designer-' || c.id || '@placeholder.homeatelier.ph';
    END IF;

    UPDATE designer_club_applications
    SET email = placeholder_email,
        notes = COALESCE(notes, '') || ' | Auto-generated email (was missing)'
    WHERE id = c.id;
  END LOOP;
END $$;
