-- Migration 016: inbox_channels / inbox_contacts / inbox_conversations / inbox_messages
--
-- These tables already exist in some environments (legacy PayloadCMS-era
-- baseline) but were never captured by a migration in this chain, so a
-- fresh database (e.g. production, which never had the Facebook inbox
-- feature touch it before) doesn't have them at all. This captures the
-- schema the Facebook webhook (apps/website/src/app/api/webhooks/facebook/route.ts)
-- and any future inbox channel actually use, with id defaults included
-- from the start (see 014_inbox_id_defaults.sql for the same fix applied
-- to environments where these tables already existed without a default).

CREATE TABLE IF NOT EXISTS inbox_channels (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  external_account_id VARCHAR,
  external_page_id VARCHAR,
  brand_key VARCHAR,
  access_token_encrypted VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_channels_external_page_id ON inbox_channels(external_page_id);

CREATE TABLE IF NOT EXISTS inbox_contacts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR,
  email VARCHAR,
  phone VARCHAR,
  facebook_psid VARCHAR,
  instagram_user_id VARCHAR,
  website_visitor_id VARCHAR,
  source VARCHAR,
  customer_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_contacts_facebook_psid ON inbox_contacts(facebook_psid);
CREATE INDEX IF NOT EXISTS idx_inbox_contacts_instagram_user_id ON inbox_contacts(instagram_user_id);

CREATE TABLE IF NOT EXISTS inbox_conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  channel_id VARCHAR NOT NULL REFERENCES inbox_channels(id) ON DELETE CASCADE,
  contact_id VARCHAR NOT NULL REFERENCES inbox_contacts(id) ON DELETE CASCADE,
  status VARCHAR DEFAULT 'open',
  assigned_to_id VARCHAR,
  subject VARCHAR,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_conversations_channel_contact ON inbox_conversations(channel_id, contact_id);

CREATE TABLE IF NOT EXISTS inbox_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id VARCHAR NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
  direction VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'received',
  body TEXT,
  attachments JSONB,
  external_message_id VARCHAR,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_conversation_id ON inbox_messages(conversation_id);
