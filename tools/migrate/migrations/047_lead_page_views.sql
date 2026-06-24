-- 046_lead_page_views.sql
-- Track page views per lead for the lead detail analytics dashboard.
-- Records every page a lead visits, how long they stayed, and the session.
-- This powers: time-on-page metrics, top viewed pages, browsing history.

CREATE TABLE IF NOT EXISTS chatbot.lead_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES chatbot.leads(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  title TEXT,
  referrer TEXT,
  session_id UUID,                           -- groups views within one visit session
  time_on_page_sec NUMERIC(10,1) DEFAULT 0, -- seconds spent on this page
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lpv_lead ON chatbot.lead_page_views(lead_id);
CREATE INDEX IF NOT EXISTS idx_lpv_created ON chatbot.lead_page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lpv_session ON chatbot.lead_page_views(session_id);

COMMENT ON TABLE chatbot.lead_page_views IS
  'Per-lead page view tracking for lead analytics dashboard. Each row is one page visit with duration.';
