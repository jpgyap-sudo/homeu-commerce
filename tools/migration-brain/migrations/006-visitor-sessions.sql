-- Real-Time Visitor Sessions for DaVinciOS
-- Tracks currently active visitors with a lightweight heartbeat.
--
-- Run: psql -h localhost -U homeu -d homeu -f migrations/006-visitor-sessions.sql

CREATE TABLE IF NOT EXISTS visitor_sessions (
  visitor_id VARCHAR(100) PRIMARY KEY,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_path VARCHAR(500),
  is_admin BOOLEAN DEFAULT FALSE,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visit_count INTEGER DEFAULT 1,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Cleanup old sessions periodically (triggered by heartbeat endpoint)
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_seen ON visitor_sessions (last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_admin ON visitor_sessions (is_admin, last_seen DESC);
