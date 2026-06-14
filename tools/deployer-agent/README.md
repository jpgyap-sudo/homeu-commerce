# 🚀 Deployer Agent

Central coordination for all coding extensions. Prevents duplicate runs, queues deployments, tracks locks.

## Centralized Logging
The Deployer Agent must log all deployments and issues to the centralized logs:

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
           ┌─────────────────────────────────────────────┐
           │         Deployer Agent MCP (local)           │
           │  Port: stdio (MCP protocol)                   │
           │  Locks: PostgreSQL Central Brain              │
           └──────────┬──────────────────────────┬────────┘
                      │                          │
         ┌────────────▼────┐          ┌──────────▼──────────┐
         │  VPS SSH        │          │  VPS MCP Server     │
         │  Tailscale (pri)│          │  Port 3457 (fallback)│
         │  Public IP (sec)│          │  Runs via PM2       │
         └────────────┬────┘          └──────────┬──────────┘
                      │                          │
         ┌────────────▼──────────────────────────▼──────────┐
         │              VPS Docker                          │
         │  build.Dockerfile (separate build container)     │
         │  docker compose (production services)            │
         └──────────────────────────────────────────────────┘
```

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

# Full deploy
node tools/deployer-agent/deployer-mcp.mjs --deploy

# Show queue
node tools/deployer-agent/deployer-mcp.mjs --queue
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
