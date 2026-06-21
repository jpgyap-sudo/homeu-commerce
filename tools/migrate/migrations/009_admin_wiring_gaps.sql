-- Migration: fix several admin features referencing columns that never
-- existed (found via a systematic schema-vs-code audit, 2026-06-21).
-- Each was a fully-wired feature (UI + API) missing only the DB column.

-- customers.company — used by admin customers new/edit pages, /api/customers,
-- /api/customers/[id], /api/customers/[id]/leads, /api/customers/me.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company VARCHAR;

-- pages.status (draft/published) — admin Pages list has a status filter UI
-- and the API already reads/writes it; column never existed.
ALTER TABLE pages ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'published';

-- quotations: admin quotation creation sends a generated quotation_number,
-- and a customer email/phone snapshot (distinct from customer_email, which
-- is a different existing column) — neither ever existed as columns.
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS quotation_number VARCHAR;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS email VARCHAR;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS phone VARCHAR;
CREATE UNIQUE INDEX IF NOT EXISTS quotations_quotation_number_idx ON quotations(quotation_number) WHERE quotation_number IS NOT NULL;

-- redirects: the entire app (admin list/new/edit pages + both API routes)
-- consistently uses source/target/type — only the seed script and the table
-- itself used from_path/to_path/redirect_type. Renaming the columns (rather
-- than rewriting every consumer) since zero current code reads the old names.
-- Guarded so this is safe to re-run after the rename has already happened.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='redirects' AND column_name='from_path') THEN
    ALTER TABLE redirects RENAME COLUMN from_path TO source;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='redirects' AND column_name='to_path') THEN
    ALTER TABLE redirects RENAME COLUMN to_path TO target;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='redirects' AND column_name='redirect_type') THEN
    ALTER TABLE redirects RENAME COLUMN redirect_type TO type;
  END IF;
END $$;
