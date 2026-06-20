-- 004_quotation_versions.sql
-- Quotation versioning engine — snapshots, revisions, diff tracking
-- Run: psql -f tools/migrate/migrations/004_quotation_versions.sql

CREATE TABLE IF NOT EXISTS quotation_versions (
  id              SERIAL PRIMARY KEY,
  quotation_id    INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  version_number  INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'active',
  -- revision_type: 'initial' | 'admin_edit' | 'customer_revision' | 'reverted'
  revision_type   TEXT NOT NULL DEFAULT 'initial',
  -- snapshot of the full quotation at this version
  snapshot        JSONB NOT NULL,
  -- changelog: what changed from previous version
  changelog       JSONB DEFAULT '[]'::jsonb,
  -- customer's revision request message (if revision_type = 'customer_revision')
  revision_message TEXT DEFAULT '',
  -- who created this version
  created_by      TEXT DEFAULT 'system',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotation_versions_qid ON quotation_versions(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_versions_qid_vn ON quotation_versions(quotation_id, version_number);

-- Add current_version to quotations table for quick reference
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS pending_revision BOOLEAN DEFAULT false;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS revision_request TEXT DEFAULT '';
