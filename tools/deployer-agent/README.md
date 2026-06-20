# 🚀 Deployer Agent

Central coordination for **ALL** coding extensions (Roo, Claude, Blackbox, Codex, Kilo Code, etc.).
Prevents duplicate runs, queues deployments, tracks locks, enforces **git sync before deploy**,
and **guarantees no committed work is left behind**.

## Core Philosophy: Persistence + Sync Gate

Multiple AI coding extensions work on this repository simultaneously. Each extension commits
code independently. The Deployer Agent provides two guarantees:

> ✅ **Sync Gate** — Before ANY deploy, the agent checks local ↔ origin sync (dirty files, ahead/behind). Blocks deploy if out of sync. Auto-repairs when possible.
>
> ✅ **Persistence** — Every commit from every extension gets deployed — nothing falls through the cracks.

The agent tracks the **last deployed commit SHA** in the database, then compares it against
the current git log on the VPS. Any commits newer than the last deployment are flagged as
**"pending"** and can be deployed in bulk.

## Git Sync Gate (NEW)

### Why It Exists

Multiple AI coding extensions can leave the local repo in an inconsistent state:
- **Uncommitted files** — an extension made changes but forgot to commit
- **Unpushed commits** — local is ahead of origin (e.g., proxy blocked push)
- **Behind origin** — another extension pushed but you haven't pulled

The **Sync Gate** catches ALL of these before any deploy operation.

### How It Works

Every call to `deployer_deploy`, `deployer_deploy_pending`, or `deployer_build` **automatically** runs the sync gate first:

```
Extension calls deploy → SYNC GATE activates:
  1. git status --porcelain        → any dirty files?
  2. git fetch origin              → can we reach GitHub?
     ↓ (if fails, retry via HTTP proxy at 127.0.0.1:10809)
  3. git rev-list HEAD..origin     → behind? → auto pull --rebase
  4. git rev-list origin..HEAD     → ahead?  → auto push
  5. git stash (if dirty)          → save work, pull, pop stash
  6. Record sync state in DB       → deployer_sync_state table
  7. PASS → proceed with deploy
     BLOCK → return error with guidance
```

### Sync Gate TTL

The gate caches the sync result for **5 minutes**. If you call deploy again within 5 minutes,
it skips re-checking (unless you use `force: true`).

### Manual Sync Check

Extensions can also call `deployer_sync_check` directly:

```javascript
// Check sync state and auto-repair
const result = await callTool('deployer_sync_check', {
  force: true,       // Force re-check (skip 5-min cache)
  auto_repair: true  // Auto-stash, pull, push (default: true)
})

// Result:
// {
//   "passed": true,
//   "sha": "a1b2c3d4e5f6",
//   "branch": "master",
//   "details": {
//     "dirtyFiles": 0,
//     "aheadCount": 0,
//     "behindCount": 0,
//     "fetchOk": true,
//     "pushOk": true
//   },
//   "autoRepair": null,
//   "errors": []
// }
```

### Sync Status Dashboard

See what ALL extensions' sync states look like:

```javascript
const status = await callTool('deployer_sync_status', { limit: 10 })
// Shows: current local state + last N sync records from all extensions
// Including: who checked, when, status, dirty count, errors
```
### Registering Extensions

All known coding extensions should be registered in the `deployer_gate_rules` table.
Run the seed script against the Central Brain PostgreSQL once:

```bash
psql $DATABASE_URI -f tools/deployer-agent/seed-gate-rules.sql
```

Extensions are also auto-registered when they call `deployer_sync_check` (via
`ON CONFLICT UPDATE` in `recordSyncState()`).

## Centralized Logging


All deployments and issues should be logged to the centralized logs:

```javascript
import { logTask, logBug } from '../shared/central-logger.mjs';

// Log active deployment
await logTask({
  agent: 'deployer',
  status: 'active',
  summary: 'Deploying dashboard to VPS',
  files: ['apps/web/', 'docker/'],
  verification: 'Docker build in progress'
});

// Log completed deployment
await logTask({
  agent: 'deployer',
  status: 'completed',
  summary: 'Deployed dashboard v2.3.1 to VPS',
  files: ['apps/web/', 'memory/task-log.jsonl'],
  verification: 'VPS health check passed - homepage loads'
});

// Log deployment bug
await logBug({
  agent: 'deployer',
  status: 'found',
  summary: 'Docker build failed - npm install error',
  files: ['docker/build.Dockerfile'],
  verification: 'Build logs show ECONNREFUSED'
});
```

## Architecture

```
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │   Roo    │  │  Claude  │  │ Blackbox │  │  Codex   │  ← Coding Extensions
  │ (Code)   │  │ (Code)   │  │ (Code)   │  │ (Code)   │
  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
       │              │             │              │
       │      ┌───────▼───────────────┐           │
       └──────▶  Deployer Agent MCP   ◀───────────┘
               │  (tools/deployer-    │
               │   agent/deployer-    │
               │   mcp.mjs)           │
               └───────┬───────────────┘
                       │
          ┌────────────▼────────────┐
          │  PostgreSQL Central Brain │
          │  - deployer_locks        │
          │  - deployer_queue        │
          │  - deployer_history [*]  │ ← Tracks last deployed commit SHA
          └────────────┬────────────┘
                       │
          ┌────────────▼──────────────────────────────┐
          │          VPS (via SSH/MCP)                 │
          │  - git log (compare commits)               │
          │  - docker compose build & restart          │
          │  - health checks                           │
          └────────────────────────────────────────────┘
```

## Persistence Workflow

```
1. Extension commits code ──▶ git push to VPS
2. Extension calls `deployer_pending` ──▶ Check if deployed
3. Extension calls `deployer_deploy_pending` ──▶ Deploy ALL pending
4. Deployer records commit SHA in `deployer_history`
5. Next extension calls `deployer_pending` ──▶ Shows "nothing pending"
```

This works **regardless of which extension made the commits**. The deployer reads the
shared git log, so it sees work from Roo, Claude, Blackbox, Codex, and any other
extensions equally.

## Multiple Coding Extension Coordination

When multiple extensions request the same operation:

1. **Lock check** — Deployer checks PostgreSQL for existing lock
2. **Queue** — If locked, task is queued with priority
3. **Execute** — When lock is released, next queued task runs
4. **Report** — Result stored in deployer_history

## Commands

### Local (via MCP)

These are available as MCP tools. The Deployer Agent runs as an MCP server:

```bash
# Run as MCP server (for AI agent consumption)
node tools/deployer-agent/deployer-mcp.mjs

# Show status
node tools/deployer-agent/deployer-mcp.mjs --status

# Full deploy (deploys whatever is at HEAD)
node tools/deployer-agent/deployer-mcp.mjs --deploy

# Show queue
node tools/deployer-agent/deployer-mcp.mjs --queue

# Show pending commits from ALL extensions
node tools/deployer-agent/deployer-mcp.mjs --pending

# Deploy ALL pending commits from ALL extensions
node tools/deployer-agent/deployer-mcp.mjs --deploy-pending

# [NEW] Run git sync check (LOCAL only — checks dirty, ahead, behind)
node tools/deployer-agent/deployer-mcp.mjs --sync-check

# [NEW] Show sync status dashboard for ALL extensions
node tools/deployer-agent/deployer-mcp.mjs --sync-status
```

### MCP Tools Available

| Tool | Description |
|------|-------------|
| `deployer_status` | Queue status, locks, last deployment, VPS health |
| **🔒 `deployer_sync_check`** | **[MANDATORY GATE] Check local↔origin sync. Auto-repair. Called automatically by deploy tools.** |
| **🔒 `deployer_sync_status`** | **Sync dashboard for ALL extensions — current state + last N records** |
| `deployer_build` | Queue Docker build — **runs sync gate first** |
| `deployer_deploy` | Queue full deploy: git pull → build → restart — **runs sync gate first** |
| `deployer_sync` | Queue Shopify → Central Brain sync |
| `deployer_scan` | Queue Playwright site scan |
| `deployer_queue_list` | List all active queue items |
| `deployer_vps_test` | Test VPS connectivity (all methods) |
| `deployer_health` | Quick health check: homepage, admin, postgres |
| ✅ **`deployer_pending`** | **Check ALL pending commits from ANY coding extension** |
| ✅ **`deployer_deploy_pending`** | **Deploy ALL pending commits — runs sync gate first** |

### Using `deployer_pending` (Recommended for all extensions)

Before deploying, **always check what's pending**:

```javascript
// Any coding extension can call this to see what needs deploying
const result = await callTool('deployer_pending', {})

// Result includes:
// {
//   "lastDeployed": "abc123def456...",
//   "pendingCount": 3,
//   "pending": [
//     {
//       "sha": "def789...",
//       "author": "Claude",
//       "date": "2026-06-14",
//       "message": "feat: add quotation maker page",
//       "files": [
//         "apps/website/src/collections/Quotations.ts",
//         "apps/website/src/app/admin/quotations/new/page.tsx"
//       ]
//     },
//     ...
//   ],
//   "summary": "📋 3 pending commit(s) found..."
// }
```

### Using `deployer_deploy_pending` (The Safest Way to Deploy)

This tool:
1. Checks the database for the last deployed commit SHA
2. Connects to VPS and runs `git log <last_deployed>..HEAD`
3. Collects ALL pending commits from ALL extensions
4. If nothing is pending, reports success immediately
5. If commits are pending, runs: `git pull` → `docker compose build` → `up -d` → health check
6. Records the new HEAD commit in `deployer_history`

```javascript
// Deploy absolutely everything that's been committed
const result = await callTool('deployer_deploy_pending', {})
// Result: "✅ Deployed 3 pending commit(s) successfully!"
```

### VPS MCP (Fallback Connection)

```bash
# Install on VPS
sh docker/deployer-setup.sh

# Test connection
curl http://localhost:3457/ping
curl http://localhost:3457/health

# Execute command
curl -X POST http://localhost:3457/exec \
  -H 'Content-Type: application/json' \
  -d '{"command":"docker compose ps"}'
```

## Connection Priority

1. **Tailscale SSH** (`100.64.175.88`) — Primary, secure mesh
2. **Public IP SSH** (`104.248.225.250`) — Fallback if Tailscale is down
3. **VPS MCP** (`localhost:3457`) — Last resort HTTP-based

## Build (Next.js Turbopack)

```bash
# Incremental build on VPS (cached — only changed files recompile)
ssh root@vps "cd /opt/homeu-commerce/apps/website && npx next build"

# Zero-downtime restart
ssh root@vps "pm2 reload homeu-website"
```

## How It Works Under The Hood

### Commit Tracking

```
deployer_history table:
┌──────────┬──────────┬─────────────────┬──────────────┐
│ commit_sha          │ status  │ deployed_by       │
├──────────┼──────────┼─────────────────┼──────────────┤
│ a1b2c3d4 │ success  │ ext-roo-abc     │
│ e5f6g7h8 │ success  │ ext-claude-def  │ ← LAST DEPLOYED
└──────────┴──────────┴─────────────────┴──────────────┘

checkPendingCommits():
  SELECT last deployed SHA → "e5f6g7h8"
  git log e5f6g7h8..HEAD → [i9j0k1l2 (Roo), m3n4o5p6 (Blackbox), q7r8s9t0 (Codex)]
  → 3 pending commits from 3 different extensions
```

### Database Schema

The `deployer_history` table stores the commit SHA of each successful deployment.
The `deployer_locks` table prevents concurrent builds. The `deployer_queue` table
ensures no deployment request is lost.

See [`queue-schema.sql`](queue-schema.sql) for full schema.
