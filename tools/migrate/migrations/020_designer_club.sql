-- Migration 020: Designer Club trade signup applications.
--
-- The live homeu.ph /pages/designerclub page has a B2B signup form
-- (name, position, email, company, address, contact number, company
-- socials) that was lost during the Shopify-page-content migration — only
-- the two banner images survived. This adds a table to actually capture
-- submissions and an admin view to act on them.

CREATE TABLE IF NOT EXISTS designer_club_applications (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_address TEXT,
  contact_number TEXT,
  company_socials TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'approved', 'declined')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_designer_club_applications_status ON designer_club_applications(status);
CREATE INDEX IF NOT EXISTS idx_designer_club_applications_created_at ON designer_club_applications(created_at DESC);
