-- Deployer Agent Queue Schema
-- Stored in Central Brain PostgreSQL for persistence across coding extensions

-- Active deployment locks (prevents duplicate runs)
CREATE TABLE IF NOT EXISTS deployer_locks (
  id SERIAL PRIMARY KEY,
  lock_key VARCHAR(100) UNIQUE NOT NULL,  -- e.g., 'build', 'deploy', 'migrate', 'scan'
  locked_by VARCHAR(100),                  -- coding extension identifier
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                  -- auto-expire lock
  status VARCHAR(20) DEFAULT 'locked',     -- locked, running, completed, failed
  metadata JSONB
);

-- Deployment queue (ordered tasks)
CREATE TABLE IF NOT EXISTS deployer_queue (
  id SERIAL PRIMARY KEY,
  task_type VARCHAR(50) NOT NULL,          -- build, deploy, scan, migrate, sync
  priority INTEGER DEFAULT 0,              -- higher = more urgent
  status VARCHAR(20) DEFAULT 'queued',     -- queued, running, completed, failed, cancelled
  requested_by VARCHAR(100),               -- which coding extension
  request_id VARCHAR(100) UNIQUE,          -- idempotency key
  metadata JSONB,                           -- task parameters
  result JSONB,                            -- task output
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Deployment history
CREATE TABLE IF NOT EXISTS deployer_history (
  id SERIAL PRIMARY KEY,
  commit_sha VARCHAR(40),
  branch VARCHAR(100) DEFAULT 'master',
  status VARCHAR(20),                      -- success, failed, rolled_back
  duration_seconds INTEGER,
  docker_image VARCHAR(200),
  git_message TEXT,
  deployed_by VARCHAR(100),
  queue_item_id INTEGER REFERENCES deployer_queue(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extension registry (tracks which coding extensions are active)
CREATE TABLE IF NOT EXISTS deployer_extensions (
  id SERIAL PRIMARY KEY,
  extension_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100),
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  active_lock VARCHAR(100),
  ip_address INET,
  metadata JSONB
);

-- ════════════════════════════════════════════════════════════
-- GIT SYNC STATE — Tracks local↔origin sync for all extensions
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS deployer_sync_state (
  id SERIAL PRIMARY KEY,
  last_synced_sha VARCHAR(40) NOT NULL,
  last_sync_time TIMESTAMPTZ DEFAULT NOW(),
  synced_by VARCHAR(100) NOT NULL,           -- which extension checked
  status VARCHAR(20) DEFAULT 'synced',       -- synced, dirty, behind, ahead, blocked, error
  ahead_count INTEGER DEFAULT 0,             -- commits ahead of origin
  behind_count INTEGER DEFAULT 0,            -- commits behind origin
  dirty_count INTEGER DEFAULT 0,             -- uncommitted files
  stash_created BOOLEAN DEFAULT FALSE,       -- whether stash was needed
  error_message TEXT,
  details TEXT,
  UNIQUE(last_synced_sha, synced_by)
);

-- ════════════════════════════════════════════════════════════
-- DEPLOYER GATE RULES — Which extensions must sync before deploy
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS deployer_gate_rules (
  id SERIAL PRIMARY KEY,
  extension_id VARCHAR(100) UNIQUE NOT NULL,
  extension_name VARCHAR(100),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  sync_required BOOLEAN DEFAULT TRUE,        -- MUST pass sync check before deploy
  auto_sync BOOLEAN DEFAULT TRUE,            -- auto-stash/pull/push on check
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_queue_status ON deployer_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_queue_created ON deployer_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_locks_key ON deployer_locks(lock_key);
CREATE INDEX IF NOT EXISTS idx_history_commit ON deployer_history(commit_sha);
CREATE INDEX IF NOT EXISTS idx_sync_time ON deployer_sync_state(last_sync_time);
CREATE INDEX IF NOT EXISTS idx_sync_sha ON deployer_sync_state(last_synced_sha);
