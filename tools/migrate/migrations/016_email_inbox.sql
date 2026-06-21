-- 016_email_inbox.sql
-- Creates the emails table for the incoming email inbox system.
-- Used by the IMAP sync engine to store synced emails from Zoho.

BEGIN;

CREATE TABLE IF NOT EXISTS emails (
  id SERIAL PRIMARY KEY,
  message_id TEXT UNIQUE NOT NULL,
  in_reply_to TEXT,
  subject TEXT,
  sender_name TEXT,
  sender_email TEXT,
  recipient_email TEXT,
  cc TEXT,
  body_text TEXT,
  body_html TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'inbox',
  folder TEXT DEFAULT 'INBOX',
  replied_at TIMESTAMP(3) WITH TIME ZONE,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  received_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS emails_received_at_idx ON emails(received_at DESC);
CREATE INDEX IF NOT EXISTS emails_sender_email_idx ON emails(sender_email);
CREATE INDEX IF NOT EXISTS emails_category_idx ON emails(category);
CREATE INDEX IF NOT EXISTS emails_folder_idx ON emails(folder);
CREATE INDEX IF NOT EXISTS emails_is_read_idx ON emails(is_read);

COMMIT;
