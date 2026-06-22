-- RFQ file attachments (client-uploaded reference images, floor plans,
-- project photos, quotes — PDF/image/Excel/Word) + RFQ auto-archive after
-- 30 days with no admin response, with a customer-requestable extension.

CREATE TABLE IF NOT EXISTS rfq_attachments (
  id                SERIAL PRIMARY KEY,
  rfq_request_id    INTEGER NOT NULL REFERENCES rfq_requests(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  storage_key       TEXT NOT NULL,
  filename          VARCHAR NOT NULL,
  mime_type         VARCHAR,
  size_bytes        INTEGER,
  uploaded_by       VARCHAR NOT NULL DEFAULT 'customer' CHECK (uploaded_by IN ('customer', 'admin')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS rfq_attachments_rfq_idx ON rfq_attachments(rfq_request_id);
CREATE INDEX IF NOT EXISTS rfq_attachments_expires_idx ON rfq_attachments(expires_at) WHERE deleted_at IS NULL;

-- Archive: an RFQ stuck at status='new' (no admin response yet) past its
-- deadline gets archived (soft — archived_at set, row + chat history kept)
-- by the cleanup sweep. Customers can request an extension before the
-- deadline; the store approves/denies from the admin RFQ detail page.
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS auto_archive_deadline TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS extension_status VARCHAR NOT NULL DEFAULT 'none' CHECK (extension_status IN ('none', 'requested', 'approved', 'denied'));
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS extension_reason TEXT;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS extension_approved_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS rfq_requests_archive_sweep_idx ON rfq_requests(status, archived_at, auto_archive_deadline) WHERE archived_at IS NULL;
