-- 013_dashboard_insights.sql
-- Adds admin_activity tracking table for dashboard "Recent Activity" widget
-- and ensures emails table has replied_at + is_read columns for unreplied tracking.

BEGIN;

-- Admin activity log for dashboard "Recent Activity" widget
CREATE TABLE IF NOT EXISTS admin_activity (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP(3) WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_activity_created_at_idx ON admin_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_activity_admin_id_idx ON admin_activity(admin_id);

-- Ensure emails table has columns needed for unreplied tracking
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'emails') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'is_read') THEN
      ALTER TABLE emails ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'emails' AND column_name = 'replied_at') THEN
      ALTER TABLE emails ADD COLUMN replied_at TIMESTAMP(3) WITH TIME ZONE;
    END IF;
  END IF;
END $$;

-- Ensure inbox_messages has direction column for unreplied tracking
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inbox_messages') THEN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'inbox_messages' AND column_name = 'direction') THEN
      ALTER TABLE inbox_messages ADD COLUMN direction TEXT DEFAULT 'inbound'
        CHECK (direction IN ('inbound', 'outbound'));
    END IF;
  END IF;
END $$;

COMMIT;
