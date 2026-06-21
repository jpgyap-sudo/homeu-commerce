-- Migration 023: allow NULL company_name on designer_club_applications.
-- Needed to import legacy Shopify customers tagged "designer" (signed up
-- via the old Shopify Forms app) — those records only have name/email/phone,
-- no company/position/address data, unlike new submissions through the
-- rebuilt form which still requires company_name.

ALTER TABLE designer_club_applications ALTER COLUMN company_name DROP NOT NULL;
