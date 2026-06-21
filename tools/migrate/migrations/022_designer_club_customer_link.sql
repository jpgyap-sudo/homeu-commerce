-- Migration 022: link designer_club_applications to an existing customer
-- account by email, if one exists (auto-link added to the public submission
-- route alongside CSV export + Telegram alerts in the admin queue).

ALTER TABLE designer_club_applications ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_designer_club_applications_customer_id ON designer_club_applications(customer_id);
