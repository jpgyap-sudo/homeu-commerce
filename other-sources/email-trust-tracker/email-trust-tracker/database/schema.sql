CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  mobile TEXT,
  role TEXT CHECK (role IN ('architect','designer','contractor','homeowner','other')) DEFAULT 'other',
  company TEXT,
  email_verified_at TIMESTAMPTZ,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','bounced','complained','failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  complained_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES email_messages(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('open','click','unsubscribe','bounce','complaint','delivered','product_view','rfq_add','rfq_submit','appointment_booked','contact_card_download','reply_prompt_seen')),
  url TEXT,
  product_id TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_events_customer_created ON email_events(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_events_message_type ON email_events(message_id, event_type);
CREATE INDEX IF NOT EXISTS idx_email_messages_customer ON email_messages(customer_id);

CREATE OR REPLACE VIEW customer_email_stats AS
SELECT
  c.id AS customer_id,
  c.email,
  c.full_name,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status IN ('sent','delivered')) AS sent_count,
  COUNT(DISTINCT e_open.id) AS open_count,
  COUNT(DISTINCT e_click.id) AS click_count,
  COUNT(DISTINCT e_rfq.id) AS rfq_count,
  COUNT(DISTINCT e_appointment.id) AS appointment_count,
  MAX(e.created_at) AS last_activity_at
FROM customers c
LEFT JOIN email_messages m ON m.customer_id = c.id
LEFT JOIN email_events e ON e.customer_id = c.id
LEFT JOIN email_events e_open ON e_open.customer_id = c.id AND e_open.event_type = 'open'
LEFT JOIN email_events e_click ON e_click.customer_id = c.id AND e_click.event_type = 'click'
LEFT JOIN email_events e_rfq ON e_rfq.customer_id = c.id AND e_rfq.event_type = 'rfq_submit'
LEFT JOIN email_events e_appointment ON e_appointment.customer_id = c.id AND e_appointment.event_type = 'appointment_booked'
GROUP BY c.id, c.email, c.full_name;
