-- Import Shopify customers CSV into customers table
-- Run: psql $DATABASE_URI -f tools/import-shopify-customers.sql
-- The CSV must be loaded into a temp table first using:
--   \copy shopify_customers_temp FROM 'customers_export.csv' WITH (FORMAT CSV, HEADER true)

BEGIN;

-- Create temp table matching Shopify export columns
CREATE TEMP TABLE shopify_customers_temp (
  customer_id TEXT, first_name TEXT, last_name TEXT, email TEXT,
  accepts_email_marketing TEXT, default_address_company TEXT,
  default_address_address1 TEXT, default_address_address2 TEXT,
  default_address_city TEXT, default_address_province_code TEXT,
  default_address_country_code TEXT, default_address_zip TEXT,
  default_address_phone TEXT, phone TEXT, accepts_sms_marketing TEXT,
  total_spent TEXT, total_orders TEXT, note TEXT,
  tax_exempt TEXT, tags TEXT
);

-- Load CSV
\copy shopify_customers_temp FROM 'customers_export.csv' WITH (FORMAT CSV, HEADER true, QUOTE '"', ESCAPE '"');

-- Insert or update customers
WITH imported AS (
  SELECT
    LOWER(TRIM(BOTH '''' FROM email)) AS clean_email,
    TRIM(first_name) AS fn,
    TRIM(last_name) AS ln,
    TRIM(COALESCE(default_address_phone, phone)) AS phone_num,
    TRIM(default_address_company) AS comp,
    TRIM(note) AS cust_note,
    TRIM(tags) AS tag_str,
    TRIM(default_address_address1) AS addr1,
    TRIM(default_address_address2) AS addr2,
    TRIM(default_address_city) AS city,
    TRIM(default_address_province_code) AS province
  FROM shopify_customers_temp
  WHERE email IS NOT NULL AND email != ''
)
INSERT INTO customers (email, name, phone, company, notes, address, status, role, created_at, updated_at)
SELECT
  clean_email,
  COALESCE(NULLIF(fn || ' ' || ln, ' '), SPLIT_PART(clean_email, '@', 1)) AS full_name,
  NULLIF(phone_num, ''),
  NULLIF(comp, ''),
  NULLIF(cust_note, ''),
  NULLIF(CONCAT_WS(', ', addr1, addr2, city, province), ''),
  'active', 'customer', NOW(), NOW()
FROM imported
ON CONFLICT (email) DO UPDATE SET
  name = COALESCE(NULLIF(EXCLUDED.name, ''), customers.name),
  phone = COALESCE(NULLIF(EXCLUDED.phone, ''), customers.phone),
  company = COALESCE(NULLIF(EXCLUDED.company, ''), customers.company),
  notes = CASE
    WHEN EXCLUDED.notes IS NOT NULL AND customers.notes IS NULL THEN EXCLUDED.notes
    WHEN EXCLUDED.notes IS NOT NULL AND customers.notes IS NOT NULL THEN customers.notes || E'\n' || EXCLUDED.notes
    ELSE customers.notes
  END,
  address = COALESCE(NULLIF(EXCLUDED.address, ''), customers.address),
  updated_at = NOW();

-- Sync designer/trade/wholesale tagged customers into designer_club_applications
INSERT INTO designer_club_applications (first_name, last_name, email, company_name, company_address, contact_number, status, notes, created_at)
SELECT
  TRIM(first_name), TRIM(last_name),
  LOWER(TRIM(BOTH '''' FROM email)),
  COALESCE(NULLIF(TRIM(default_address_company), ''), 'Unknown'),
  TRIM(CONCAT_WS(', ', default_address_address1, default_address_address2, default_address_city, default_address_province_code)),
  COALESCE(NULLIF(TRIM(COALESCE(default_address_phone, phone)), ''), ''),
  'approved',
  'Imported from Shopify. Tags: ' || TRIM(tags),
  NOW()
FROM shopify_customers_temp
WHERE email IS NOT NULL AND email != ''
  AND (LOWER(tags) LIKE '%designer%' OR LOWER(tags) LIKE '%trade%' OR LOWER(tags) LIKE '%wholesale%')
  AND NOT EXISTS (SELECT 1 FROM designer_club_applications d WHERE LOWER(d.email) = LOWER(TRIM(BOTH '''' FROM shopify_customers_temp.email)));

DROP TABLE shopify_customers_temp;

COMMIT;
