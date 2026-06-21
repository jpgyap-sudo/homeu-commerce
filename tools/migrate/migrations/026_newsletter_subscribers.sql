-- Migration 026: newsletter_subscribers table.
--
-- Previously only ever created ad-hoc via inline `CREATE TABLE IF NOT
-- EXISTS` in apps/website/src/app/api/newsletter/route.ts and
-- api/rfq/submit/route.ts (whichever endpoint happened to run first).
-- api/rfq/route.ts's auto-subscribe-on-RFQ logic has no such inline
-- CREATE TABLE at all and would silently no-op (wrapped in a best-effort
-- try/catch) if this table didn't exist yet — making it a real migration
-- closes that gap for good.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'newsletter',
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_source ON newsletter_subscribers(source);
