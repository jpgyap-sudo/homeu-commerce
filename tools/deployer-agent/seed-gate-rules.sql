-- ════════════════════════════════════════════════════════════
--  SEED: Deployer Gate Rules — Extension Registration
--  ════════════════════════════════════════════════════════════
--  Run this ONCE against the Central Brain PostgreSQL to register
--  ALL known coding extensions with the Git Sync Gate.
--
--  After seeding, any extension that calls deployer_sync_check will
--  auto-register itself via ON CONFLICT UPDATE in recordSyncState().
--
--  Usage:
--    psql $DATABASE_URI -f tools/deployer-agent/seed-gate-rules.sql
-- ════════════════════════════════════════════════════════════

-- First, ensure the table exists (safe to run if already created)
\i tools/deployer-agent/queue-schema.sql

-- Seed known extensions
INSERT INTO deployer_gate_rules (extension_id, extension_name, sync_required, auto_sync)
VALUES
  ('ext-roo-code',       'Roo Code (VS Code)',        TRUE, TRUE),
  ('ext-claude-code',    'Claude Code (CLI)',          TRUE, TRUE),
  ('ext-blackbox',       'Blackbox Agent',             TRUE, TRUE),
  ('ext-codex-brain',    'Codex Brain',                TRUE, TRUE),
  ('ext-kilo-code',      'Kilo Code',                  TRUE, TRUE),
  ('ext-roo-cline',      'Roo Cline',                  TRUE, TRUE),
  ('ext-superroo',       'SuperRoo VS Code',           TRUE, TRUE)
ON CONFLICT (extension_id) DO UPDATE SET
  last_seen    = NOW(),
  sync_required = TRUE,
  auto_sync     = TRUE;

-- Verify
SELECT extension_id, extension_name, sync_required, auto_sync, last_seen
FROM deployer_gate_rules
ORDER BY extension_name;
