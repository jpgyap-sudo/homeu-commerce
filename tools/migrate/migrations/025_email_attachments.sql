-- 024_email_attachments.sql
-- Stores email attachment metadata. Attachment data is stored inline (base64)
-- in the DB temporarily. When admin clicks to view, it's uploaded to DO Spaces
-- and the CDN URL is saved. This avoids uploading attachments during sync.

BEGIN;

CREATE TABLE IF NOT EXISTS email_attachments (
  id SERIAL PRIMARY KEY,
  email_id INTEGER NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  data_base64 TEXT,           -- inline base64 data (temporary, before DO Spaces upload)
  spaces_key TEXT,             -- DO Spaces path after on-demand upload
  cdn_url TEXT,                -- CDN URL after on-demand upload
  is_inline BOOLEAN DEFAULT FALSE,
  cid TEXT,                    -- Content-ID for inline images
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id ON email_attachments(email_id);

COMMIT;
