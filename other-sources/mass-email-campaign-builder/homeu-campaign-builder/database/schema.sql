CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  company TEXT,
  role TEXT CHECK (role IN ('architect','designer','contractor','homeowner','developer','other')) DEFAULT 'other',
  email_verified BOOLEAN DEFAULT FALSE,
  marketing_consent BOOLEAN DEFAULT FALSE,
  consent_source TEXT,
  tags TEXT[] DEFAULT '{}',
  lead_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE suppression_list (
  email TEXT PRIMARY KEY,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe','bounce','complaint','manual')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  rule JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT,
  html_body TEXT NOT NULL,
  text_body TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id),
  segment_id UUID REFERENCES segments(id),
  status TEXT NOT NULL CHECK (status IN ('draft','scheduled','sending','paused','sent','cancelled')) DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued','sending','sent','failed','skipped')) DEFAULT 'queued',
  provider_message_id TEXT,
  error TEXT,
  queued_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  UNIQUE(campaign_id, contact_id)
);

CREATE TABLE email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES campaign_recipients(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('delivered','open','click','unsubscribe','bounce','complaint','rfq','booking','product_view','contact_download')),
  url TEXT,
  metadata JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_contacts_role ON contacts(role);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_recipients_campaign_status ON campaign_recipients(campaign_id, status);
CREATE INDEX idx_events_campaign_type ON email_events(campaign_id, event_type);
CREATE INDEX idx_events_contact ON email_events(contact_id);

INSERT INTO segments (name, description, rule) VALUES
('All Consented Contacts', 'Everyone who opted in and is not suppressed', '{"marketing_consent": true}'),
('Architects', 'Architects who opted in', '{"role": "architect", "marketing_consent": true}'),
('Designers', 'Interior designers who opted in', '{"role": "designer", "marketing_consent": true}'),
('Hot Leads', 'Contacts with lead score 70+', '{"lead_score_gte": 70, "marketing_consent": true}');
