# 🚀 Deployer Agent

Central coordination for **ALL** coding extensions (Roo, Claude, Blackbox, Codex, etc.).
Prevents duplicate runs, queues deployments, tracks locks, and **guarantees no committed work is left behind**.

## Core Philosophy: Persistence

Multiple AI coding extensions work on this repository simultaneously. Each extension commits
code independently. The Deployer Agent's **persistence guarantee** ensures that:

> ✅ **Every commit from every extension gets deployed — nothing falls through the cracks.**

The agent tracks the **last deployed commit SHA** in the database, then compares it against
the current git log on the VPS. Any commits newer than the last deployment are flagged as
**"pending"** and can be deployed in bulk.

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

# [NEW] Show pending commits from ALL extensions
node tools/deployer-agent/deployer-mcp.mjs --pending

# [NEW] Deploy ALL pending commits from ALL extensions
node tools/deployer-agent/deployer-mcp.mjs --deploy-pending
```

### MCP Tools Available

| Tool | Description |
|------|-------------|
| `deployer_status` | Queue status, locks, last deployment, VPS health |
| `deployer_build` | Queue Docker build (deduplicated, locked) |
| `deployer_deploy` | Queue full deploy: pull → build → restart |
| `deployer_sync` | Queue Shopify → Central Brain sync |
| `deployer_scan` | Queue Playwright site scan |
| `deployer_queue_list` | List all active queue items |
| `deployer_vps_test` | Test VPS connectivity (all methods) |
| `deployer_health` | Quick health check: homepage, admin, postgres |
| ✅ **`deployer_pending`** | **Check ALL pending commits from ANY coding extension** — compares git log vs last deployed SHA. Returns author, date, message, and files changed. |
| ✅ **`deployer_deploy_pending`** | **Deploy ALL pending commits from ANY coding extension** — checks for un-deployed commits, then runs full deploy cycle for everything at once. This is the recommended way to ensure no work is left behind. |

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

## Build Container

```bash
# Separate build container (doesn't affect running site)
docker build -f docker/build.Dockerfile -t homeu-build .

# Or
docker compose --profile build up builder
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
