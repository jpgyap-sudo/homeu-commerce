# Deployer Agent Skill

Central deployment coordinator for multiple coding extensions.

## Architecture

```
Extension A ──┐
              ├──→ Deployer Agent MCP ──→ Queue ──→ PostgreSQL Locks
Extension B ──┘                              │
                                             └──→ VPS (Tailscale → Public → VPS MCP)
```

## Key Concepts

### Locks
Only one extension can build/deploy at a time. Locks auto-expire after 5 minutes.

### Queue
If lock is held, task goes to queue. Next task runs when lock releases.

### Connections
1. Tailscale SSH (primary, secure mesh)
2. Public IP SSH (fallback)
3. VPS MCP Server (last resort HTTP API)

## Commands

```bash
# Run the deployer MCP server (for AI agents to connect)
node tools/deployer-agent/deployer-mcp.mjs

# Show status
node tools/deployer-agent/deployer-mcp.mjs --status

# Queue a full deploy
node tools/deployer-agent/deployer-mcp.mjs --deploy

# Show queue
node tools/deployer-agent/deployer-mcp.mjs --queue
```

## MCP Tools

| Tool | Purpose |
|------|---------|
| `deployer_status` | Full status: locks, queue, history, VPS health |
| `deployer_build` | Queue Docker build (locked) |
| `deployer_deploy` | Queue full deploy (git pull → build → restart) |
| `deployer_sync` | Queue Shopify data sync |
| `deployer_scan` | Queue Playwright scan |
| `deployer_queue_list` | List active queue items |
| `deployer_vps_test` | Test all VPS connection methods |
| `deployer_health` | Quick health check |

## Multi-Extension Coordination

```
deployer_deploy called
    ↓
Lock 'deploy' acquired → Yes → Execute deploy
    ↓ No                          ↓
Queue task as 'deploy'    Release lock
    ↓                          ↓
Wait for lock              Next queued task runs
    ↓                          ↓
Lock released → Execute     Notify extensions
```

## Separate Build Container

```bash
# Build without affecting production services
docker build -f docker/build.Dockerfile -t homeu-build .
```
